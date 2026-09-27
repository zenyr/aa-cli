import { AaApi, Cache, observedQuotaOf, RateLimited, ResponseMeta, UsageError } from "@aa/domain"
import type { AaApiRequest, AaError, QuotaSnapshot } from "@aa/domain"
import { Clock, Effect, Option, Schema } from "effect"
import type { CacheMode } from "./result.ts"

// 캐시 키: path + 정렬된 query 문자열.
export const cacheKey = (path: string, query: Record<string, string>): string => {
  const sorted = Object.keys(query)
    .toSorted()
    .map((k) => `${k}=${query[k]}`)
    .join("&")
  return sorted.length > 0 ? `${path}?${sorted}` : path
}

export interface CachedGetParams<A, I> {
  readonly path: string
  readonly query: Record<string, string>
  readonly schema: Schema.Schema<A, I>
  readonly cacheMode: CacheMode
  readonly ttlSeconds: number
}

export interface CachedGetOutcome<A> {
  readonly body: A
  readonly meta: ResponseMeta
}

const storedSchema = <A, I>(schema: Schema.Schema<A, I>) =>
  Schema.Struct({ body: schema, meta: ResponseMeta })

// 캐시에 저장된 값을 스키마로 재디코드한다. 디코드 실패나 신선도 요구 미충족은 miss 로 취급한다.
const readCached = <A, I>(
  storedValue: unknown,
  storedAt: number,
  schema: Schema.Schema<A, I>,
  ttlSeconds: number,
  requireFresh: boolean,
): Effect.Effect<Option.Option<CachedGetOutcome<A>>> =>
  Effect.gen(function* () {
    const decoded = Schema.decodeUnknownOption(storedSchema(schema))(storedValue)
    if (Option.isNone(decoded)) return Option.none()
    if (requireFresh) {
      const now = yield* Clock.currentTimeMillis
      if (now - storedAt > ttlSeconds * 1000) return Option.none()
    }
    const meta = new ResponseMeta({ ...decoded.value.meta, cached: true })
    return Option.some({ body: decoded.value.body, meta })
  })

// 실패 응답이 들고 온 tier/rateLimit 을 스냅샷에 반영한다. tier 만 있으면 기존 스냅샷의 tier 만 갱신한다.
const recordObservedQuota = (e: AaError): Effect.Effect<void, never, Cache> =>
  Effect.gen(function* () {
    const { tier, rateLimit } = observedQuotaOf(e)
    if (tier === null) return
    const cache = yield* Cache
    if (rateLimit !== null) {
      const observedAt = yield* Clock.currentTimeMillis
      yield* cache.setRateLimit({ tier, rateLimit, observedAt })
      return
    }
    const previous = yield* cache.getRateLimit()
    if (Option.isSome(previous)) {
      yield* cache.setRateLimit({ ...previous.value, tier })
    }
  })

// 실제 API 호출 후 캐시에 저장하고, rate limit 스냅샷도 갱신한다. 실패해도 관측된 티어/쿼터는 기록한다.
const fetchAndStore = <A, I>(
  key: string,
  params: CachedGetParams<A, I>,
): Effect.Effect<CachedGetOutcome<A>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const api = yield* AaApi
    const cache = yield* Cache
    const req: AaApiRequest<A, I> = {
      path: params.path,
      query: params.query,
      schema: params.schema,
    }
    const result = yield* Effect.either(api.get(req))
    if (result._tag === "Left") {
      yield* recordObservedQuota(result.left)
      return yield* Effect.fail(result.left)
    }
    const { body, meta } = result.right
    yield* cache.set(key, { body, meta }, params.ttlSeconds)
    if (meta.tier !== null && meta.rate_limit !== null) {
      const observedAt = yield* Clock.currentTimeMillis
      yield* cache.setRateLimit({ tier: meta.tier, rateLimit: meta.rate_limit, observedAt })
    }
    return { body, meta }
  })

// 캐시된 스냅샷의 남은 한도가 0이고 아직 리셋 전이면, API 를 부르지 않고 RateLimited 로 실패한다.
const preflightGuard = (now: number, snapshot: QuotaSnapshot): Effect.Effect<void, AaError> => {
  const resetMs = snapshot.rateLimit.reset * 1000
  if (snapshot.rateLimit.remaining > 0 || now >= resetMs) return Effect.void
  return Effect.fail(
    new RateLimited({
      message: "daily quota exhausted (local check)",
      resetAt: snapshot.rateLimit.reset,
      retryAfter: Math.ceil((resetMs - now) / 1000),
      hint: "wait until reset or use cached data (--offline)",
    }),
  )
}

// 캐시를 감싼 GET. `use`/`bypass`/`only` 모드를 여기서 해석한다.
export const cachedGet = <A, I>(
  params: CachedGetParams<A, I>,
): Effect.Effect<CachedGetOutcome<A>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const cache = yield* Cache
    const key = cacheKey(params.path, params.query)
    const mode = params.cacheMode

    if (mode !== "bypass") {
      const entry = yield* cache.get(key)
      if (Option.isSome(entry)) {
        const fresh = yield* readCached(
          entry.value.value,
          entry.value.storedAt,
          params.schema,
          params.ttlSeconds,
          mode === "use",
        )
        if (Option.isSome(fresh)) return fresh.value
      }
      if (mode === "only") {
        return yield* Effect.fail(new UsageError({ message: "not in cache (offline)" }))
      }
    }

    const snapshot = yield* cache.getRateLimit()
    if (Option.isSome(snapshot)) {
      const now = yield* Clock.currentTimeMillis
      yield* preflightGuard(now, snapshot.value)
    }

    return yield* fetchAndStore(key, params)
  })
