import { Effect, Layer, Schema } from "effect"
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
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const params = {
      path: "/thing",
      query: {},
      schema: payloadSchema,
      cacheMode: "use" as const,
      ttlSeconds: 0,
    }
    const first = await Effect.runPromise(Effect.provide(cachedGet(params), layer))
    const second = await Effect.runPromise(Effect.provide(cachedGet(params), layer))

    expect(calls).toBe(2)
    expect(first.body.value).toBe(1)
    expect(second.body.value).toBe(2)
  })
})
