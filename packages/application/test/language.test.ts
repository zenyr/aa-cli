import { TierError } from "@aa/domain"
import { Effect, Layer } from "effect"
import { describe, expect, it } from "bun:test"
import { compareModels, listLanguageModels } from "../src/language.ts"
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
})
