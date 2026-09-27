import { AaApi, Cache, TierError } from "@aa/domain"
import type { AaApiRequest, AaError, CacheEntry, QuotaSnapshot, ResponseMeta } from "@aa/domain"
import { Effect, Layer, Option, Schema } from "effect"

// 테스트용 인메모리 AaApi: path 별로 등록된 핸들러를 그대로 호출한다.
export type FakeHandler = (
  req: AaApiRequest<unknown, unknown>,
) => Effect.Effect<{ readonly body: unknown; readonly meta: ResponseMeta }, AaError>

export interface FakeApiState {
  readonly handlers: Map<string, FakeHandler>
  callCount: number
}

export const makeFakeApiState = (): FakeApiState => ({ handlers: new Map(), callCount: 0 })

export const registerHandler = (state: FakeApiState, path: string, handler: FakeHandler): void => {
  state.handlers.set(path, handler)
}

export const fakeApiLayer = (state: FakeApiState) =>
  Layer.succeed(AaApi, {
    get: <A, I>(req: AaApiRequest<A, I>) => {
      state.callCount += 1
      const handler = state.handlers.get(req.path)
      if (handler === undefined) {
        return Effect.fail(
          new TierError({ message: `no fake handler for ${req.path}` }),
        ) as Effect.Effect<{ readonly body: A; readonly meta: ResponseMeta }, AaError>
      }
      return handler(req as AaApiRequest<unknown, unknown>) as Effect.Effect<
        { readonly body: A; readonly meta: ResponseMeta },
        AaError
      >
    },
  })

// 테스트용 인메모리 Cache.
export interface FakeCacheState {
  readonly store: Map<string, CacheEntry>
  quota: Option.Option<QuotaSnapshot>
}

export const makeFakeCacheState = (): FakeCacheState => ({ store: new Map(), quota: Option.none() })

export const fakeCacheLayer = (state: FakeCacheState) =>
  Layer.succeed(Cache, {
    get: (key: string) => Effect.succeed(Option.fromNullable(state.store.get(key))),
    set: (key: string, value: unknown, _ttlSeconds: number) =>
      Effect.sync(() => {
        state.store.set(key, { value, storedAt: Date.now() })
      }),
    clear: () =>
      Effect.sync(() => {
        state.store.clear()
      }),
    getRateLimit: () => Effect.succeed(state.quota),
    setRateLimit: (snapshot: QuotaSnapshot) =>
      Effect.sync(() => {
        state.quota = Option.some(snapshot)
      }),
  })

export const okMeta = (
  overrides: Partial<{
    tier: ResponseMeta["tier"]
    cached: boolean
    source: string
  }> = {},
): ResponseMeta => ({
  tier: overrides.tier ?? "free",
  rate_limit: { limit: 100, remaining: 87, reset: 1790000000 },
  source: overrides.source ?? "https://artificialanalysis.ai/api/v2/test",
  cached: overrides.cached ?? false,
  fetched_at: "2026-09-27T00:00:00.000Z",
})

export const unknownSchema = Schema.Unknown
