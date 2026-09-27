import { AaApi, Cache, ResponseMeta, UsageError } from "@aa/domain"
import type { AaApiRequest, AaError } from "@aa/domain"
import { Effect, Option, Schema } from "effect"
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
): Option.Option<CachedGetOutcome<A>> => {
  const decoded = Schema.decodeUnknownOption(storedSchema(schema))(storedValue)
  if (Option.isNone(decoded)) return Option.none()
  if (requireFresh && Date.now() - storedAt > ttlSeconds * 1000) return Option.none()
  const meta = new ResponseMeta({ ...decoded.value.meta, cached: true })
  return Option.some({ body: decoded.value.body, meta })
}

// 실제 API 호출 후 캐시에 저장하고, rate limit 스냅샷도 갱신한다.
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
    const { body, meta } = yield* api.get(req)
    yield* cache.set(key, { body, meta }, params.ttlSeconds)
    if (meta.tier !== null && meta.rate_limit !== null) {
      yield* cache.setRateLimit({
        tier: meta.tier,
        rateLimit: meta.rate_limit,
        observedAt: Date.now(),
      })
    }
    return { body, meta }
  })

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
        const fresh = readCached(
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

    return yield* fetchAndStore(key, params)
  })
