import type { CacheEntry, QuotaSnapshot } from "@aa/domain"
import { Cache } from "@aa/domain"
import { Clock, Context, Effect, Layer, Option, Ref } from "effect"

type CacheService = Context.Tag.Service<typeof Cache>

interface StoredEntry {
  readonly storedAt: number
  readonly expiresAt: number
  readonly value: unknown
}

// 테스트용 인메모리 캐시. 파일 캐시와 동일한 TTL 의미론을 따른다.
export const CacheMemory: Layer.Layer<Cache> = Layer.effect(
  Cache,
  Effect.gen(function* () {
    const entries = yield* Ref.make(new Map<string, StoredEntry>())
    const quota = yield* Ref.make(Option.none<QuotaSnapshot>())

    const get: CacheService["get"] = (key) =>
      Effect.gen(function* () {
        const map = yield* Ref.get(entries)
        const stored = map.get(key)
        if (stored === undefined) return Option.none()
        const now = yield* Clock.currentTimeMillis
        if (stored.expiresAt <= now) return Option.none()
        const entry: CacheEntry = { value: stored.value, storedAt: stored.storedAt }
        return Option.some(entry)
      })

    const set: CacheService["set"] = (key, value, ttlSeconds) =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis
        yield* Ref.update(entries, (map) => {
          const next = new Map(map)
          next.set(key, { storedAt: now, expiresAt: now + ttlSeconds * 1000, value })
          return next
        })
      })

    const clear: CacheService["clear"] = () => Ref.set(entries, new Map())

    const getRateLimit: CacheService["getRateLimit"] = () => Ref.get(quota)

    const setRateLimit: CacheService["setRateLimit"] = (snapshot) =>
      Ref.set(quota, Option.some(snapshot))

    const clearRateLimit: CacheService["clearRateLimit"] = () => Ref.set(quota, Option.none())

    return Cache.of({ get, set, clear, getRateLimit, setRateLimit, clearRateLimit })
  }),
)
