import { AaApi, Cache, ItemEnvelope, LanguageModel, ListEnvelope, NotFound } from "@aa/domain"
import type { AaError, PerfInterval, PerfWindow, PromptType, ResponseMeta } from "@aa/domain"
import { Effect, Either, Schema } from "effect"
import { cachedGet } from "./cached.ts"
import { collectAllPages } from "./paging.ts"
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

    const attempt = (path: string): Effect.Effect<AttemptOutcome, AaError, AaApi | Cache> =>
      o.allPages === true
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

export const getLanguageModel = (
  slug: string,
  o: GetLanguageModelOpts,
): Effect.Effect<Result<LanguageModel>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const cacheMode = resolveCacheMode(o)
    const ttlSeconds = resolveTtlSeconds(o)
    const schema = ItemEnvelope(LanguageModel)
    const query = buildLanguageQuery({ promptType: o.promptType })
    const r = yield* cachedGet({
      path: `/language/models/${slug}`,
      query,
      schema,
      cacheMode,
      ttlSeconds,
    })
    return toResult(r.body.data, r.meta)
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

// 리스트 전체(allPages)를 한 번 받아 입력 순서대로 골라낸다. 누락된 slug 는 NotFound.
export const compareModels = (
  slugs: ReadonlyArray<string>,
  o: CompareModelsOpts,
): Effect.Effect<Result<ReadonlyArray<LanguageModel>>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const r = yield* listLanguageModels({ ...o, allPages: true })
    const bySlug = new Map(r.data.map((m) => [m.slug, m] as const))
    const missing = slugs.filter((s) => !bySlug.has(s))
    if (missing.length > 0) {
      return yield* Effect.fail(
        new NotFound({ message: `model(s) not found: ${missing.join(", ")}` }),
      )
    }
    const picked = slugs.flatMap((s) => {
      const m = bySlug.get(s)
      return m === undefined ? [] : [m]
    })
    return toResult(picked, r.meta, r.notices)
  })
