import { describe, expect, it } from "bun:test"
import { formatJson, formatJsonl } from "../src/format/json.ts"
import { formatMd } from "../src/format/md.ts"
import { formatTable } from "../src/format/table.ts"
import { formatTsv } from "../src/format/tsv.ts"
import type { OutputMeta } from "../src/format/types.ts"

const meta: OutputMeta = {
  tier: "free",
  rate_limit: { limit: 100, remaining: 87, reset: 1790000000 },
  source: "https://artificialanalysis.ai/api/v2/language/models/free",
  cached: false,
  fetched_at: "2026-09-27T00:00:00.000Z",
  attribution: "Data: Artificial Analysis (https://artificialanalysis.ai)",
  notices: ["fell back to /free"],
}

const rows = [
  { slug: "a", name: "Alpha", score: 1.2, note: null },
  { slug: "b", name: "Beta", score: null, note: "ok" },
]

describe("formatJson", () => {
  it("keeps a stable key order for data and meta", () => {
    const out = formatJson(rows, meta)
    const parsed = JSON.parse(out)
    expect(Object.keys(parsed)).toEqual(["data", "meta"])
    expect(Object.keys(parsed.meta)).toEqual([
      "tier",
      "rate_limit",
      "source",
      "cached",
      "fetched_at",
      "attribution",
      "notices",
    ])
  })

  it("keeps null values as null, not coerced to 0", () => {
    const out = formatJson(rows, meta)
    const parsed = JSON.parse(out)
    expect(parsed.data[0].note).toBeNull()
    expect(parsed.data[1].score).toBeNull()
  })
})

describe("formatJsonl", () => {
  it("emits one JSON object per line with no meta", () => {
    const out = formatJsonl(rows)
    const lines = out.split("\n")
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0] ?? "")).toEqual(rows[0])
  })
})

describe("formatTable", () => {
  it("renders null as a dash", () => {
    const out = formatTable(rows)
    expect(out).toContain("-")
    const lines = out.split("\n")
    expect(lines[0]).toContain("slug")
    expect(lines[0]).toContain("name")
  })

  it("returns empty string for no rows", () => {
    expect(formatTable([])).toBe("")
  })
})

describe("formatTsv", () => {
  it("renders null as empty string and separates with tabs", () => {
    const out = formatTsv(rows)
    const lines = out.split("\n")
    expect(lines[0]).toBe("slug\tname\tscore\tnote")
    expect(lines[1]).toBe("a\tAlpha\t1.2\t")
  })
})

describe("formatMd", () => {
  it("renders a markdown table with dash for null", () => {
    const out = formatMd(rows)
    const lines = out.split("\n")
    expect(lines[0]).toBe("| slug | name | score | note |")
    expect(lines[1]).toBe("| --- | --- | --- | --- |")
    expect(lines[2]).toContain("-")
  })
})
