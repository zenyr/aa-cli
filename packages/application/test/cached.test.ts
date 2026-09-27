import { RateLimit, TierError } from "@aa/domain"
import { Effect, Layer, Option, Schema, TestClock, TestContext } from "effect"
import { describe, expect, it } from "bun:test"
import { cachedGet } from "../src/cached.ts"
import {
  fakeApiLayer,
  fakeCacheLayer,
  makeFakeApiState,
  makeFakeCacheState,
  okMeta,
  registerHandler,
} from "./fakes.ts"

const payloadSchema = Schema.Struct({ value: Schema.Number })

describe("cachedGet", () => {
  it("use: fetches once, then serves from cache on second call", async () => {
    const apiState = makeFakeApiState()
    let calls = 0
    registerHandler(apiState, "/thing", () => {
      calls += 1
      return Effect.succeed({ body: { value: 1 }, meta: okMeta() })
    })
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const params = {
      path: "/thing",
      query: {},
      schema: payloadSchema,
      cacheMode: "use" as const,
      ttlSeconds: 60,
    }
    const first = await Effect.runPromise(Effect.provide(cachedGet(params), layer))
    const second = await Effect.runPromise(Effect.provide(cachedGet(params), layer))

    expect(calls).toBe(1)
    expect(first.meta.cached).toBe(false)
    expect(second.meta.cached).toBe(true)
    expect(second.body.value).toBe(1)
  })

  it("bypass: always fetches, still stores", async () => {
    const apiState = makeFakeApiState()
    let calls = 0
    registerHandler(apiState, "/thing", () => {
      calls += 1
      return Effect.succeed({ body: { value: calls }, meta: okMeta() })
    })
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const params = {
      path: "/thing",
      query: {},
      schema: payloadSchema,
      cacheMode: "bypass" as const,
      ttlSeconds: 60,
    }
    const first = await Effect.runPromise(Effect.provide(cachedGet(params), layer))
    const second = await Effect.runPromise(Effect.provide(cachedGet(params), layer))

    expect(calls).toBe(2)
    expect(first.body.value).toBe(1)
    expect(second.body.value).toBe(2)
    expect(cacheState.store.size).toBe(1)
  })

  it("only: returns UsageError on cache miss, never calls the API", async () => {
    const apiState = makeFakeApiState()
    let calls = 0
    registerHandler(apiState, "/thing", () => {
      calls += 1
      return Effect.succeed({ body: { value: 1 }, meta: okMeta() })
    })
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const params = {
      path: "/thing",
      query: {},
      schema: payloadSchema,
      cacheMode: "only" as const,
      ttlSeconds: 60,
    }
    const exit = await Effect.runPromiseExit(Effect.provide(cachedGet(params), layer))

    expect(calls).toBe(0)
    expect(exit._tag).toBe("Failure")
  })

  it("only: serves from cache once warmed by a prior use call", async () => {
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/thing", () =>
      Effect.succeed({ body: { value: 42 }, meta: okMeta() }),
    )
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const useParams = {
      path: "/thing",
      query: {},
      schema: payloadSchema,
      cacheMode: "use" as const,
      ttlSeconds: 60,
    }
    await Effect.runPromise(Effect.provide(cachedGet(useParams), layer))

    const onlyParams = { ...useParams, cacheMode: "only" as const }
    const result = await Effect.runPromise(Effect.provide(cachedGet(onlyParams), layer))
    expect(result.body.value).toBe(42)
    expect(result.meta.cached).toBe(true)
  })

  it("use: refetches once the cached entry is stale", async () => {
    const apiState = makeFakeApiState()
    let calls = 0
    registerHandler(apiState, "/thing", () => {
      calls += 1
      return Effect.succeed({ body: { value: calls }, meta: okMeta() })
    })
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(
      fakeApiLayer(apiState),
      fakeCacheLayer(cacheState),
      TestContext.TestContext,
    )

    const params = {
      path: "/thing",
      query: {},
      schema: payloadSchema,
      cacheMode: "use" as const,
      ttlSeconds: 60,
    }
    const program = Effect.gen(function* () {
      const first = yield* cachedGet(params)
      yield* TestClock.adjust("61 seconds")
      const second = yield* cachedGet(params)
      return { first, second }
    })
    const { first, second } = await Effect.runPromise(Effect.provide(program, layer))

    expect(calls).toBe(2)
    expect(first.body.value).toBe(1)
    expect(second.body.value).toBe(2)
  })

  it("records tier+rateLimit from a failing call into the quota snapshot, then re-fails", async () => {
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/thing", () =>
      Effect.fail(
        new TierError({
          message: "pro required",
          status: 403,
          tier: "free",
          rateLimit: new RateLimit({ limit: 100, remaining: 12, reset: 1790000000 }),
        }),
      ),
    )
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const params = {
      path: "/thing",
      query: {},
      schema: payloadSchema,
      cacheMode: "use" as const,
      ttlSeconds: 60,
    }
    const exit = await Effect.runPromiseExit(Effect.provide(cachedGet(params), layer))

    expect(exit._tag).toBe("Failure")
    expect(Option.isSome(cacheState.quota)).toBe(true)
    if (Option.isSome(cacheState.quota)) {
      expect(cacheState.quota.value.tier).toBe("free")
      expect(cacheState.quota.value.rateLimit.remaining).toBe(12)
    }
  })

  it("preflight: blocks with zero AaApi calls when quota is exhausted and not yet reset", async () => {
    const apiState = makeFakeApiState()
    let calls = 0
    registerHandler(apiState, "/thing", () => {
      calls += 1
      return Effect.succeed({ body: { value: 1 }, meta: okMeta() })
    })
    const cacheState = makeFakeCacheState()
    cacheState.quota = Option.some({
      tier: "free",
      rateLimit: { limit: 100, remaining: 0, reset: 1000 },
      observedAt: 0,
    })
    const layer = Layer.mergeAll(
      fakeApiLayer(apiState),
      fakeCacheLayer(cacheState),
      TestContext.TestContext,
    )

    const params = {
      path: "/thing",
      query: {},
      schema: payloadSchema,
      cacheMode: "use" as const,
      ttlSeconds: 60,
    }
    const program = Effect.gen(function* () {
      yield* TestClock.setTime(500 * 1000)
      return yield* Effect.exit(cachedGet(params))
    })
    const exit = await Effect.runPromise(Effect.provide(program, layer))

    expect(exit._tag).toBe("Failure")
    expect(calls).toBe(0)
  })

  it("preflight: allows the call once now passes the reset time", async () => {
    const apiState = makeFakeApiState()
    let calls = 0
    registerHandler(apiState, "/thing", () => {
      calls += 1
      return Effect.succeed({ body: { value: 1 }, meta: okMeta() })
    })
    const cacheState = makeFakeCacheState()
    cacheState.quota = Option.some({
      tier: "free",
      rateLimit: { limit: 100, remaining: 0, reset: 1000 },
      observedAt: 0,
    })
    const layer = Layer.mergeAll(
      fakeApiLayer(apiState),
      fakeCacheLayer(cacheState),
      TestContext.TestContext,
    )

    const params = {
      path: "/thing",
      query: {},
      schema: payloadSchema,
      cacheMode: "use" as const,
      ttlSeconds: 60,
    }
    const program = Effect.gen(function* () {
      yield* TestClock.setTime(1001 * 1000)
      return yield* cachedGet(params)
    })
    const result = await Effect.runPromise(Effect.provide(program, layer))

    expect(calls).toBe(1)
    expect(result.body.value).toBe(1)
  })
})
