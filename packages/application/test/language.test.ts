import { TierError } from "@aa/domain"
import { Effect, Layer, Option } from "effect"
import { describe, expect, it } from "bun:test"
import {
  compareModels,
  findLanguageModels,
  getLanguageModel,
  listLanguageModels,
} from "../src/language.ts"
import {
  fakeApiLayer,
  fakeCacheLayer,
  makeFakeApiState,
  makeFakeCacheState,
  okMeta,
  registerHandler,
} from "./fakes.ts"

const model = (slug: string, intelligence: number) => ({
  id: `id-${slug}`,
  name: slug,
  slug,
  release_date: "2025-01-01",
  model_creator: { id: "creator-1", name: "Acme" },
  evaluations: { artificial_analysis_intelligence_index: intelligence },
  pricing: { price_1m_input_tokens: 1, price_1m_output_tokens: 2 },
  performance: { median_output_tokens_per_second: 100 },
})

describe("listLanguageModels", () => {
  it("falls back to /free on TierError and adds a notice", async () => {
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/language/models", () =>
      Effect.fail(new TierError({ message: "pro required", status: 403 })),
    )
    registerHandler(apiState, "/language/models/free", () =>
      Effect.succeed({ body: { tier: "free", data: [model("a", 10)] }, meta: okMeta() }),
    )
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const result = await Effect.runPromise(Effect.provide(listLanguageModels({}), layer))
    expect(result.data.length).toBe(1)
    expect(result.data[0]?.slug).toBe("a")
    expect(result.notices.some((n) => n.includes("fell back"))).toBe(true)
  })

  it("calls /free directly when free: true, without touching pro path", async () => {
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/language/models/free", () =>
      Effect.succeed({ body: { tier: "free", data: [model("a", 10)] }, meta: okMeta() }),
    )
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const result = await Effect.runPromise(
      Effect.provide(listLanguageModels({ free: true }), layer),
    )
    expect(result.data[0]?.slug).toBe("a")
    expect(result.notices.length).toBe(0)
  })

  it("collects all pages when allPages: true", async () => {
    const apiState = makeFakeApiState()
    let calls = 0
    registerHandler(apiState, "/language/models", (req) => {
      calls += 1
      const page = req.query?.page === "2" ? 2 : 1
      const hasMore = page === 1
      return Effect.succeed({
        body: {
          tier: "pro",
          data: [model(`p${page}`, page)],
          pagination: { page, page_size: 1, total_pages: 2, has_more: hasMore },
        },
        meta: okMeta({ tier: "pro" }),
      })
    })
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const result = await Effect.runPromise(
      Effect.provide(listLanguageModels({ allPages: true }), layer),
    )
    expect(calls).toBe(2)
    expect(result.data.map((m) => m.slug)).toEqual(["p1", "p2"])
  })

  it("skips the pro attempt entirely when tier memory says free", async () => {
    const apiState = makeFakeApiState()
    let proCalls = 0
    registerHandler(apiState, "/language/models", () => {
      proCalls += 1
      return Effect.fail(new TierError({ message: "pro required" }))
    })
    registerHandler(apiState, "/language/models/free", () =>
      Effect.succeed({ body: { tier: "free", data: [model("a", 10)] }, meta: okMeta() }),
    )
    const cacheState = makeFakeCacheState()
    cacheState.quota = Option.some({
      tier: "free",
      rateLimit: { limit: 100, remaining: 90, reset: 0 },
      observedAt: 0,
    })
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const result = await Effect.runPromise(Effect.provide(listLanguageModels({}), layer))
    expect(result.data[0]?.slug).toBe("a")
    expect(result.notices.length).toBe(0)
    expect(proCalls).toBe(0)
  })

  it("defaults allPages to true when page is not given", async () => {
    const apiState = makeFakeApiState()
    let calls = 0
    registerHandler(apiState, "/language/models", (req) => {
      calls += 1
      const page = req.query?.page === "2" ? 2 : 1
      const hasMore = page === 1
      return Effect.succeed({
        body: {
          tier: "pro",
          data: [model(`d${page}`, page)],
          pagination: { page, page_size: 1, total_pages: 2, has_more: hasMore },
        },
        meta: okMeta({ tier: "pro" }),
      })
    })
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const result = await Effect.runPromise(Effect.provide(listLanguageModels({}), layer))
    expect(calls).toBe(2)
    expect(result.data.map((m) => m.slug)).toEqual(["d1", "d2"])
  })

  it("fetches a single page when page is given explicitly", async () => {
    const apiState = makeFakeApiState()
    let calls = 0
    registerHandler(apiState, "/language/models", (req) => {
      calls += 1
      const page = req.query?.page === "2" ? 2 : 1
      return Effect.succeed({
        body: {
          tier: "pro",
          data: [model(`d${page}`, page)],
          pagination: { page, page_size: 1, total_pages: 2, has_more: page === 1 },
        },
        meta: okMeta({ tier: "pro" }),
      })
    })
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const result = await Effect.runPromise(Effect.provide(listLanguageModels({ page: 2 }), layer))
    expect(calls).toBe(1)
    expect(result.data.map((m) => m.slug)).toEqual(["d2"])
  })

  it("propagates non-tier errors without falling back", async () => {
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/language/models", () =>
      Effect.fail(new TierError({ message: "should not matter" })),
    )
    registerHandler(apiState, "/language/models/free", () =>
      Effect.fail(new TierError({ message: "free also fails, should surface" })),
    )
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const exit = await Effect.runPromiseExit(Effect.provide(listLanguageModels({}), layer))
    expect(exit._tag).toBe("Failure")
  })
})

describe("compareModels", () => {
  it("preserves input slug order and fails with NotFound on missing slugs", async () => {
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/language/models", () =>
      Effect.succeed({
        body: { tier: "pro", data: [model("a", 1), model("b", 2), model("c", 3)] },
        meta: okMeta({ tier: "pro" }),
      }),
    )
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const ok = await Effect.runPromise(Effect.provide(compareModels(["c", "a"], {}), layer))
    expect(ok.data.map((m) => m.slug)).toEqual(["c", "a"])

    const cacheState2 = makeFakeCacheState()
    const layer2 = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState2))
    const exit = await Effect.runPromiseExit(
      Effect.provide(compareModels(["a", "zzz"], {}), layer2),
    )
    expect(exit._tag).toBe("Failure")
  })

  it("resolves names and notes alternatives, preserving input order", async () => {
    const opus55 = model("claude-opus-5-5", 10)
    const opus55Low = model("claude-opus-5-5-low", 9)
    const opus5 = model("claude-opus-5", 8)
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/language/models", () =>
      Effect.succeed({
        body: { tier: "pro", data: [opus55, opus55Low, opus5] },
        meta: okMeta({ tier: "pro" }),
      }),
    )
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const result = await Effect.runPromise(
      Effect.provide(compareModels(["opus 5.5", "claude-opus-5"], {}), layer),
    )
    expect(result.data.map((m) => m.slug)).toEqual(["claude-opus-5-5", "claude-opus-5"])
    expect(result.notices.some((n) => n.includes('resolved "opus 5.5" → claude-opus-5-5'))).toBe(
      true,
    )
  })
})

describe("findLanguageModels", () => {
  it("ranks matches and fails with NotFound on no match", async () => {
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/language/models", () =>
      Effect.succeed({
        body: {
          tier: "pro",
          data: [model("claude-opus-5", 1), model("claude-opus-5-low", 2)],
        },
        meta: okMeta({ tier: "pro" }),
      }),
    )
    const cacheState = makeFakeCacheState()
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const result = await Effect.runPromise(Effect.provide(findLanguageModels("opus 5", {}), layer))
    expect(result.data[0]?.slug).toBe("claude-opus-5")

    const cacheState2 = makeFakeCacheState()
    const layer2 = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState2))
    const exit = await Effect.runPromiseExit(
      Effect.provide(findLanguageModels("gemini", {}), layer2),
    )
    expect(exit._tag).toBe("Failure")
  })
})

describe("getLanguageModel on free tier", () => {
  it("resolves from the list and makes zero detail calls", async () => {
    let detailCalls = 0
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/language/models/free", () =>
      Effect.succeed({
        body: { tier: "free", data: [model("claude-opus-5-5", 1), model("claude-opus-5", 2)] },
        meta: okMeta({ tier: "free" }),
      }),
    )
    registerHandler(apiState, "/language/models/claude-opus-5-5", () => {
      detailCalls += 1
      return Effect.fail(new TierError({ message: "should not be called" }))
    })
    const cacheState = makeFakeCacheState()
    cacheState.quota = Option.some({
      tier: "free",
      rateLimit: { limit: 100, remaining: 90, reset: 0 },
      observedAt: 0,
    })
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(cacheState))

    const result = await Effect.runPromise(
      Effect.provide(getLanguageModel("claude-opus-5-5", {}), layer),
    )
    expect(result.data.slug).toBe("claude-opus-5-5")
    expect(result.notices.some((n) => n.includes("free tier"))).toBe(true)
    expect(detailCalls).toBe(0)
  })
})
