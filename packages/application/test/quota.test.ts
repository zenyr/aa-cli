import { Effect, Layer, Option, TestClock, TestContext } from "effect"
import { describe, expect, it } from "bun:test"
import { getQuotaView } from "../src/quota.ts"
import { fakeCacheLayer, makeFakeCacheState } from "./fakes.ts"

describe("getQuotaView", () => {
  it("returns the null view when no snapshot was ever observed", async () => {
    const cacheState = makeFakeCacheState()
    const layer = fakeCacheLayer(cacheState)

    const view = await Effect.runPromise(Effect.provide(getQuotaView(), layer))
    expect(view.tier).toBeNull()
    expect(view.stale).toBe(false)
  })

  it("reflects the snapshot as-is before the reset time", async () => {
    const cacheState = makeFakeCacheState()
    cacheState.quota = Option.some({
      tier: "free",
      rateLimit: { limit: 100, remaining: 40, reset: 1000 },
      observedAt: 0,
    })
    const layer = Layer.mergeAll(fakeCacheLayer(cacheState), TestContext.TestContext)

    const program = Effect.gen(function* () {
      yield* TestClock.setTime(500 * 1000)
      return yield* getQuotaView()
    })
    const view = await Effect.runPromise(Effect.provide(program, layer))

    expect(view.tier).toBe("free")
    expect(view.remaining).toBe(40)
    expect(view.stale).toBe(false)
    expect(view.reset_in_seconds).toBe(500)
  })

  it("assumes a full quota once the reset window has rolled over", async () => {
    const cacheState = makeFakeCacheState()
    cacheState.quota = Option.some({
      tier: "pro",
      rateLimit: { limit: 1000, remaining: 0, reset: 1000 },
      observedAt: 0,
    })
    const layer = Layer.mergeAll(fakeCacheLayer(cacheState), TestContext.TestContext)

    const program = Effect.gen(function* () {
      yield* TestClock.setTime(1001 * 1000)
      return yield* getQuotaView()
    })
    const view = await Effect.runPromise(Effect.provide(program, layer))

    expect(view.stale).toBe(true)
    expect(view.remaining).toBe(1000)
    expect(view.reset_in_seconds).toBeNull()
  })
})
