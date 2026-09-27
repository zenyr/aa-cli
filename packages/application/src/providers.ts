import { AaApi, Cache, ItemEnvelope, ListEnvelope, Provider } from "@aa/domain"
import type { AaError, PromptType } from "@aa/domain"
import { Effect, Schema } from "effect"
import { cachedGet } from "./cached.ts"
import { collectAllPages } from "./paging.ts"
import { resolveCacheMode, resolveTtlSeconds, toResult } from "./result.ts"
import type { CommonOpts, Result } from "./result.ts"

export interface ListProvidersOpts extends CommonOpts {
  readonly allPages?: boolean
}

export const listProviders = (
  o: ListProvidersOpts,
): Effect.Effect<Result<ReadonlyArray<Provider>>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const cacheMode = resolveCacheMode(o)
    const ttlSeconds = resolveTtlSeconds(o)
    const schema = ListEnvelope(Provider)

    const fetchPage = (page: number) =>
      cachedGet({
        path: "/language/providers",
        query: { page: String(page) },
        schema,
        cacheMode,
        ttlSeconds,
      })

    if (o.allPages === true) {
      const r = yield* collectAllPages((page) =>
        Effect.map(fetchPage(page), (x) => ({
          data: x.body.data,
          hasMore: x.body.pagination?.has_more === true,
          meta: x.meta,
        })),
      )
      return toResult(r.data, r.meta)
    }

    const r = yield* fetchPage(1)
    return toResult(r.body.data, r.meta)
  })

export interface GetProviderOpts extends CommonOpts {
  readonly promptType?: PromptType
}

export const getProvider = (
  slug: string,
  o: GetProviderOpts,
): Effect.Effect<Result<Provider>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const cacheMode = resolveCacheMode(o)
    const ttlSeconds = resolveTtlSeconds(o)
    const schema = ItemEnvelope(Provider)
    const query: Record<string, string> = {}
    if (o.promptType !== undefined) query.prompt_type = o.promptType
    const r = yield* cachedGet({
      path: `/language/providers/${slug}`,
      query,
      schema,
      cacheMode,
      ttlSeconds,
    })
    return toResult(r.body.data, r.meta)
  })

export interface ProviderPerfOpts extends CommonOpts {
  readonly window?: string
  readonly interval?: string
  readonly promptType?: PromptType
}

export const getProviderPerformance = (
  slug: string,
  o: ProviderPerfOpts,
): Effect.Effect<Result<unknown>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const cacheMode = resolveCacheMode(o)
    const ttlSeconds = resolveTtlSeconds(o)
    const schema = ItemEnvelope(Schema.Unknown)
    const query: Record<string, string> = {}
    if (o.window !== undefined) query.window = o.window
    if (o.interval !== undefined) query.interval = o.interval
    if (o.promptType !== undefined) query.prompt_type = o.promptType
    const r = yield* cachedGet({
      path: `/language/providers/${slug}/performance`,
      query,
      schema,
      cacheMode,
      ttlSeconds,
    })
    return toResult(r.body.data, r.meta)
  })

export interface ProviderMeasurementsOpts extends CommonOpts {
  readonly promptType?: PromptType
  readonly startDate?: string
}

export const getProviderMeasurements = (
  slug: string,
  o: ProviderMeasurementsOpts,
): Effect.Effect<Result<unknown>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const cacheMode = resolveCacheMode(o)
    const ttlSeconds = resolveTtlSeconds(o)
    const schema = ItemEnvelope(Schema.Unknown)
    const query: Record<string, string> = {}
    if (o.promptType !== undefined) query.prompt_type = o.promptType
    if (o.startDate !== undefined) query.start_date = o.startDate
    const r = yield* cachedGet({
      path: `/language/providers/${slug}/measurements`,
      query,
      schema,
      cacheMode,
      ttlSeconds,
    })
    return toResult(r.body.data, r.meta)
  })
