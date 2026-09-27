import { Effect, Layer, Option } from "effect"
import { describe, expect, it } from "bun:test"
import { listProviders } from "../src/providers.ts"
import { rawGet } from "../src/raw.ts"
import { getQuota } from "../src/quota.ts"
import { endpoints } from "../src/endpoints.ts"
import {
  fakeApiLayer,
  fakeCacheLayer,
  makeFakeApiState,
  makeFakeCacheState,
  okMeta,
  registerHandler,
} from "./fakes.ts"

const provider = (slug: string) => ({ id: `id-${slug}`, name: slug, slug })

describe("listProviders", () => {
  it("collects all pages when allPages: true", async () => {
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/language/providers", (req) => {
      const page = req.query?.page === "2" ? 2 : 1
      return Effect.succeed({
        body: {
          tier: "commercial",
          data: [provider(`p${page}`)],
          pagination: { page, page_size: 1, total_pages: 2, has_more: page === 1 },
        },
        meta: okMeta({ tier: "commercial" }),
      })
    })
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(makeFakeCacheState()))

    const result = await Effect.runPromise(Effect.provide(listProviders({ allPages: true }), layer))
    expect(result.data.map((p) => p.slug)).toEqual(["p1", "p2"])
  })
})

describe("rawGet", () => {
  it("returns the raw decoded body wrapped in a Result", async () => {
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/whatever", () =>
      Effect.succeed({ body: { ok: true }, meta: okMeta() }),
    )
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(makeFakeCacheState()))

    const result = await Effect.runPromise(Effect.provide(rawGet("/whatever", {}, {}), layer))
    expect(result.data).toEqual({ ok: true })
  })
})

describe("getQuota", () => {
  it("returns None when nothing has been observed yet", async () => {
    const layer = fakeCacheLayer(makeFakeCacheState())
    const result = await Effect.runPromise(Effect.provide(getQuota(), layer))
    expect(Option.isNone(result)).toBe(true)
  })
})

describe("endpoints", () => {
  it("lists at least the language and media catalog entries", () => {
    expect(endpoints.length).toBeGreaterThan(5)
    expect(endpoints.every((e) => e.method === "GET" || e.method === "POST")).toBe(true)
  })
})
