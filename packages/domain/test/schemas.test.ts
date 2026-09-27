import { describe, expect, it } from "bun:test"
import { Schema } from "effect"
import { LanguageModel } from "../src/language-model.ts"
import { ListEnvelope } from "../src/envelope.ts"
import { MediaModel } from "../src/media-model.ts"

// openapi.yaml 의 /language/models/free 예시를 축약한 픽스처.
const freeLanguageListFixture = {
  tier: "free",
  pagination: { page: 1, page_size: 200, total_pages: 2, has_more: true },
  data: [
    {
      id: "36f73aaf-d38a-4b56-a2b3-d04d17186910",
      name: "gpt-oss-20B (high)",
      slug: "gpt-oss-20b",
      release_date: "2025-08-05",
      model_creator: { id: "e67e56e3-15cd-43db-b679-da4660a69f41", name: "OpenAI" },
      evaluations: { artificial_analysis_intelligence_index: 24.5, some_future_metric: null },
      pricing: { price_1m_input_tokens: 0.06, price_1m_output_tokens: 0.2 },
      performance: { median_output_tokens_per_second: 296.47 },
    },
  ],
}

// openapi.yaml 의 /media/text-to-image/models 예시를 축약한 픽스처.
const mediaListFixture = {
  tier: "pro",
  data: [
    {
      id: "a1ee4d6f-d136-434b-bb1d-066fe5f9bf6f",
      name: "GPT Image 1.5 (high)",
      slug: "openai-gpt_image-1-5",
      model_creator: { id: "e67e56e3-15cd-43db-b679-da4660a69f41", name: "OpenAI" },
      elo: 1266,
      ci_95: 11,
      rank: 1,
      samples: 4650,
      release_date: "2025-12-16",
      price_per_1k_images: 133,
      open_weights_url: null,
      categories: [{ label: "General & Photorealistic", elo: 1273, ci_95: 18, samples: 1719 }],
    },
  ],
}

describe("LanguageModel list envelope", () => {
  it("decodes the free-tier example", () => {
    const decoded = Schema.decodeUnknownSync(ListEnvelope(LanguageModel))(freeLanguageListFixture)
    expect(decoded.tier).toBe("free")
    expect(decoded.pagination?.total_pages).toBe(2)
    expect(decoded.data[0]?.slug).toBe("gpt-oss-20b")
    expect(decoded.data[0]?.evaluations.artificial_analysis_intelligence_index).toBe(24.5)
  })

  it("passes unknown evaluation/pricing/performance keys through", () => {
    const decoded = Schema.decodeUnknownSync(ListEnvelope(LanguageModel))(freeLanguageListFixture)
    expect(decoded.data[0]?.evaluations.some_future_metric).toBeNull()
  })
})

describe("MediaModel list envelope", () => {
  it("decodes a pro media arena example", () => {
    const decoded = Schema.decodeUnknownSync(ListEnvelope(MediaModel))(mediaListFixture)
    expect(decoded.tier).toBe("pro")
    expect(decoded.data[0]?.rank).toBe(1)
    expect(decoded.data[0]?.open_weights_url).toBeNull()
  })
})
