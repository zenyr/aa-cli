import { TierError } from "@aa/domain"
import { Effect, Layer } from "effect"
import { describe, expect, it } from "bun:test"
import { listMedia } from "../src/media.ts"
import {
  fakeApiLayer,
  fakeCacheLayer,
  makeFakeApiState,
  makeFakeCacheState,
  okMeta,
  registerHandler,
} from "./fakes.ts"

const mediaModel = (slug: string) => ({ id: `id-${slug}`, name: slug, slug })

describe("listMedia", () => {
  it("falls back to the /free variant on TierError", async () => {
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/media/text-to-image/models", () =>
      Effect.fail(new TierError({ message: "pro required" })),
    )
    registerHandler(apiState, "/media/text-to-image/models/free", () =>
      Effect.succeed({ body: { tier: "free", data: [mediaModel("m1")] }, meta: okMeta() }),
    )
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(makeFakeCacheState()))

    const result = await Effect.runPromise(Effect.provide(listMedia("text-to-image", {}), layer))
    expect(result.data[0]?.slug).toBe("m1")
    expect(result.notices.length).toBe(1)
  })

  it("calls /free directly when free: true", async () => {
    const apiState = makeFakeApiState()
    registerHandler(apiState, "/media/text-to-speech/models/free", () =>
      Effect.succeed({ body: { tier: "free", data: [mediaModel("t1")] }, meta: okMeta() }),
    )
    const layer = Layer.mergeAll(fakeApiLayer(apiState), fakeCacheLayer(makeFakeCacheState()))

    const result = await Effect.runPromise(
      Effect.provide(listMedia("text-to-speech", { free: true }), layer),
    )
    expect(result.data[0]?.slug).toBe("t1")
  })
})
