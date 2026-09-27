import { describe, expect, test } from "bun:test"
import { Cache } from "@aa/domain"
import { Effect, Option, TestClock, TestContext } from "effect"
import { CacheMemory } from "../src/cache-memory.ts"

const runTest = <A>(effect: Effect.Effect<A, never, Cache>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(CacheMemory), Effect.provide(TestContext.TestContext)),
  )

describe("CacheMemory", () => {
  test("set then get returns the stored value", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const cache = yield* Cache
        yield* cache.set("key-1", { hello: "world" }, 60)
        return yield* cache.get("key-1")
      }),
    )
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value.value).toEqual({ hello: "world" })
    }
  })

  test("get returns none for a missing key", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const cache = yield* Cache
        return yield* cache.get("missing")
      }),
    )
    expect(Option.isNone(result)).toBe(true)
  })

  test("get returns none once the entry expires", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const cache = yield* Cache
        yield* cache.set("expiring", "value", 10)
        yield* TestClock.adjust("11 seconds")
        return yield* cache.get("expiring")
      }),
    )
    expect(Option.isNone(result)).toBe(true)
  })

  test("clear removes all entries", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const cache = yield* Cache
        yield* cache.set("a", 1, 60)
        yield* cache.clear()
        return yield* cache.get("a")
      }),
    )
    expect(Option.isNone(result)).toBe(true)
  })

  test("quota round trip", async () => {
    const snapshot = {
      tier: "pro" as const,
      rateLimit: { limit: 1000, remaining: 999, reset: 111 },
      observedAt: 222,
    }
    const result = await runTest(
      Effect.gen(function* () {
        const cache = yield* Cache
        yield* cache.setRateLimit(snapshot)
        return yield* cache.getRateLimit()
      }),
    )
    expect(result).toEqual(Option.some(snapshot))
  })
})
