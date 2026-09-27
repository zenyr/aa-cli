import { describe, expect, it } from "bun:test"
import { Either } from "effect"
import { normalizeQuery, rankCandidates, resolveOne } from "../src/resolve.ts"

interface FakeModel {
  readonly slug: string
  readonly name: string
}

const models: ReadonlyArray<FakeModel> = [
  { slug: "claude-opus-5-5", name: "Claude Opus 5.5" },
  { slug: "claude-opus-5-5-low", name: "Claude Opus 5.5 low" },
  { slug: "claude-opus-5", name: "Claude Opus 5" },
  { slug: "claude-opus-5-low", name: "Claude Opus 5 low" },
  { slug: "claude-opus-5-xhigh", name: "Claude Opus 5 xhigh" },
  { slug: "gpt-6-luna-xhigh", name: "GPT-6 Luna xhigh" },
  { slug: "gpt-6-luna-medium", name: "GPT-6 Luna medium" },
  { slug: "gpt-6-astra", name: "GPT-6 Astra" },
]

describe("normalizeQuery", () => {
  it("collapses separators and case", () => {
    expect(normalizeQuery("GPT 6_Luna/medium")).toBe("gpt-6-luna-medium")
    expect(normalizeQuery("  opus.5.5  ")).toBe("opus-5-5")
  })
})

describe("resolveOne", () => {
  it("resolves 'opus 5.5' to claude-opus-5-5 with claude-opus-5-5-low as alternative", () => {
    const result = resolveOne(models, "opus 5.5")
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.item.slug).toBe("claude-opus-5-5")
      expect(result.right.alternatives).toContain("claude-opus-5-5-low")
    }
  })

  it("resolves 'Opus 5' to claude-opus-5 with low/xhigh as alternatives", () => {
    const result = resolveOne(models, "Opus 5")
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.item.slug).toBe("claude-opus-5")
      expect(result.right.alternatives).toContain("claude-opus-5-low")
      expect(result.right.alternatives).toContain("claude-opus-5-xhigh")
    }
  })

  it("reports ambiguity for 'gpt 6 luna' across both luna variants", () => {
    const result = resolveOne(models, "gpt 6 luna")
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("UsageError")
      expect(result.left.message).toBe('ambiguous model "gpt 6 luna"')
      expect(result.left.hint).toContain("gpt-6-luna-xhigh")
      expect(result.left.hint).toContain("gpt-6-luna-medium")
    }
  })

  it("resolves an exact slug match directly with no alternatives", () => {
    const result = resolveOne(models, "gpt-6-luna-medium")
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.item.slug).toBe("gpt-6-luna-medium")
      expect(result.right.alternatives).toEqual([])
    }
  })

  it("returns NotFound for an unmatched query", () => {
    const result = resolveOne(models, "gemini")
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("NotFound")
    }
  })
})

describe("rankCandidates", () => {
  it("ranks by extra segment count ascending", () => {
    const ranked = rankCandidates(models, "opus 5")
    expect(ranked[0]?.slug).toBe("claude-opus-5")
  })
})
