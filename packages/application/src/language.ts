import { AaApi, Cache, ItemEnvelope, LanguageModel, ListEnvelope, NotFound } from "@aa/domain"
import type { AaError, PerfInterval, PerfWindow, PromptType, ResponseMeta } from "@aa/domain"
import { Effect, Either, Option, Schema } from "effect"
import { cachedGet } from "./cached.ts"
import { collectAllPages } from "./paging.ts"
import { rankCandidates, resolveOneEffect } from "./resolve.ts"
import { resolveCacheMode, resolveTtlSeconds, toResult } from "./result.ts"
import type { CommonOpts, Result } from "./result.ts"

interface AttemptOutcome {
  readonly data: ReadonlyArray<LanguageModel>
  readonly meta: ResponseMeta
}

const buildLanguageQuery = (o: {
  readonly promptType?: PromptType | undefined
  readonly page?: number | undefined
}): Record<string, string> => {
  const query: Record<string, string> = {}
  if (o.promptType !== undefined) query.prompt_type = o.promptType
  if (o.page !== undefined) query.page = String(o.page)
  return query
}

export interface ListLanguageModelsOpts extends CommonOpts {
  readonly free?: boolean
  readonly promptType?: PromptType
  readonly page?: number
  readonly allPages?: boolean
}

// pro 경로가 TierError 로 실패하면 `/free` 로 재시도하고 알림을 남긴다.
export const listLanguageModels = (
  o: ListLanguageModelsOpts,
): Effect.Effect<Result<ReadonlyArray<LanguageModel>>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const cacheMode = resolveCacheMode(o)
    const ttlSeconds = resolveTtlSeconds(o)
    const schema = ListEnvelope(LanguageModel)

    const fetchPage = (path: string, page: number) =>
      cachedGet({
        path,
        query: buildLanguageQuery({ promptType: o.promptType, page }),
        schema,
        cacheMode,
        ttlSeconds,
      })

    // page 를 명시하면 그 페이지만, 아니면 allPages 기본값 true (페이지별 캐시 키를 공유하므로 추가 비용 없음).
    const useAllPages = o.page === undefined ? (o.allPages ?? true) : false

    const attempt = (path: string): Effect.Effect<AttemptOutcome, AaError, AaApi | Cache> =>
      useAllPages
        ? collectAllPages((page) =>
            Effect.map(fetchPage(path, page), (r) => ({
              data: r.body.data,
              hasMore: r.body.pagination?.has_more === true,
              meta: r.meta,
            })),
          )
        : Effect.map(fetchPage(path, o.page ?? 1), (r) => ({ data: r.body.data, meta: r.meta }))

    if (o.free === true) {
      const r = yield* attempt("/language/models/free")
      return toResult(r.data, r.meta)
    }

    const knownQuota = yield* (yield* Cache).getRateLimit()
    if (o.free === undefined && Option.isSome(knownQuota) && knownQuota.value.tier === "free") {
      const r = yield* attempt("/language/models/free")
      return toResult(r.data, r.meta)
    }

    const primary = yield* Effect.either(attempt("/language/models"))
    if (Either.isRight(primary)) return toResult(primary.right.data, primary.right.meta)
    if (primary.left._tag !== "TierError") return yield* Effect.fail(primary.left)

    const fallback = yield* attempt("/language/models/free")
    return toResult(fallback.data, fallback.meta, [
      `tier ${fallback.meta.tier ?? "free"} lacks /language/models; fell back to /language/models/free (fewer fields)`,
    ])
  })

export interface GetLanguageModelOpts extends CommonOpts {
  readonly promptType?: PromptType
}

// 이름/slug 를 전체 리스트에서 찾아 Resolved 를 Result 로 감싼다.
const resolveFromList = (
  models: ReadonlyArray<LanguageModel>,
  query: string,
  meta: ResponseMeta,
  extraNotices: ReadonlyArray<string>,
): Effect.Effect<Result<LanguageModel>, AaError> =>
  Effect.gen(function* () {
    const resolved = yield* resolveOneEffect(models, query)
    const isExactSlug = models.some((m) => m.slug === query)
    const notices = [...extraNotices]
    if (!isExactSlug) {
      const altSuffix =
        resolved.alternatives.length > 0 ? ` (also: ${resolved.alternatives.join(", ")})` : ""
      notices.push(`resolved "${query}" → ${resolved.item.slug}${altSuffix}`)
    }
    return toResult(resolved.item, meta, notices)
  })

export const getLanguageModel = (
  query: string,
  o: GetLanguageModelOpts,
): Effect.Effect<Result<LanguageModel>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const knownQuota = yield* (yield* Cache).getRateLimit()
    const isFreeTier = Option.isSome(knownQuota) && knownQuota.value.tier === "free"
    const isExactSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query)

    const viaList = (extraNotices: ReadonlyArray<string>) =>
      Effect.gen(function* () {
        const list = yield* listLanguageModels(o)
        return yield* resolveFromList(list.data, query, list.meta, [
          ...list.notices,
          ...extraNotices,
        ])
      })

    if (!isExactSlug || isFreeTier) {
      const notices = isFreeTier ? ["free tier: detail endpoint skipped; showing list fields"] : []
      return yield* viaList(notices)
    }

    const cacheMode = resolveCacheMode(o)
    const ttlSeconds = resolveTtlSeconds(o)
    const schema = ItemEnvelope(LanguageModel)
    const detailQuery = buildLanguageQuery({ promptType: o.promptType })
    const detail = yield* Effect.either(
      cachedGet({
        path: `/language/models/${query}`,
        query: detailQuery,
        schema,
        cacheMode,
        ttlSeconds,
      }),
    )
    if (Either.isRight(detail)) return toResult(detail.right.body.data, detail.right.meta)
    if (detail.left._tag !== "TierError") return yield* Effect.fail(detail.left)
    return yield* viaList(["free tier: detail endpoint skipped; showing list fields"])
  })

export interface PerfWindowOpts extends CommonOpts {
  readonly window?: PerfWindow
  readonly interval?: PerfInterval
  readonly promptType?: PromptType
}

const buildPerfQuery = (o: PerfWindowOpts): Record<string, string> => {
  const query: Record<string, string> = {}
  if (o.window !== undefined) query.window = o.window
  if (o.interval !== undefined) query.interval = o.interval
  if (o.promptType !== undefined) query.prompt_type = o.promptType
  return query
}

export const getModelPerformance = (
  slug: string,
  o: PerfWindowOpts,
): Effect.Effect<Result<unknown>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const cacheMode = resolveCacheMode(o)
    const ttlSeconds = resolveTtlSeconds(o)
    const schema = ItemEnvelope(Schema.Unknown)
    const query = buildPerfQuery(o)
    const r = yield* cachedGet({
      path: `/language/models/${slug}/performance`,
      query,
      schema,
      cacheMode,
      ttlSeconds,
    })
    return toResult(r.body.data, r.meta)
  })

export interface CompareModelsOpts extends CommonOpts {
  readonly free?: boolean
  readonly promptType?: PromptType
}

// 리스트 전체(allPages)를 한 번 받아 입력 순서대로 이름/slug 를 해석한다.
export const compareModels = (
  queries: ReadonlyArray<string>,
  o: CompareModelsOpts,
): Effect.Effect<Result<ReadonlyArray<LanguageModel>>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const r = yield* listLanguageModels({ ...o, allPages: true })
    const notices: Array<string> = [...r.notices]
    const picked: Array<LanguageModel> = []
    for (const q of queries) {
      const resolved = yield* resolveOneEffect(r.data, q)
      const isExactSlug = r.data.some((m) => m.slug === q)
      if (!isExactSlug) {
        const altSuffix =
          resolved.alternatives.length > 0 ? ` (also: ${resolved.alternatives.join(", ")})` : ""
        notices.push(`resolved "${q}" → ${resolved.item.slug}${altSuffix}`)
      }
      picked.push(resolved.item)
    }
    return toResult(picked, r.meta, notices)
  })

export interface FindLanguageModelsOpts extends CommonOpts {
  readonly free?: boolean
  readonly promptType?: PromptType
}

// 전체 리스트를 받아 이름/slug 로 매칭되는 모든 후보를 랭킹 순으로 반환한다.
export const findLanguageModels = (
  query: string,
  o: FindLanguageModelsOpts,
): Effect.Effect<Result<ReadonlyArray<LanguageModel>>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const r = yield* listLanguageModels({ ...o, allPages: true })
    const ranked = rankCandidates(r.data, query)
    if (ranked.length === 0) {
      return yield* Effect.fail(
        new NotFound({
          message: `no match for "${query}"`,
          hint: `try \`aa find\` with a different keyword`,
        }),
      )
    }
    return toResult(ranked, r.meta, r.notices)
  })
