import { Either } from "effect"
import { describe, expect, it } from "bun:test"
import { filterRows, parseFilter, projectFields, resolveField, sortRows } from "../src/rows.ts"

const rows = [
  { slug: "a", evaluations: { intelligence: 10 }, name: "Alpha" },
  { slug: "b", evaluations: { intelligence: 30 }, name: "Beta" },
  { slug: "c", evaluations: { intelligence: null }, name: "Gamma" },
  { slug: "d", name: "Delta" },
]

describe("resolveField", () => {
  it("reads a dot path", () => {
    expect(resolveField(rows[0], "evaluations.intelligence")).toBe(10)
  })
  it("returns undefined for missing intermediate paths", () => {
    expect(resolveField(rows[3], "evaluations.intelligence")).toBeUndefined()
  })
})

describe("projectFields", () => {
  it("uses dot paths as output keys, preserves order, fills missing with null", () => {
    const out = projectFields(rows, ["slug", "evaluations.intelligence"])
    expect(Object.keys(out[0] ?? {})).toEqual(["slug", "evaluations.intelligence"])
    expect(out[3]).toEqual({ slug: "d", "evaluations.intelligence": null })
  })
})

describe("sortRows", () => {
  it("sorts ascending by default, nulls/missing last", () => {
    const sorted = sortRows(rows, "evaluations.intelligence") as typeof rows
    expect(sorted.map((r) => r.slug)).toEqual(["a", "b", "c", "d"])
  })

  it("sorts descending with a leading -, nulls/missing still last", () => {
    const sorted = sortRows(rows, "-evaluations.intelligence") as typeof rows
    expect(sorted.map((r) => r.slug)).toEqual(["b", "a", "c", "d"])
  })
})

describe("parseFilter", () => {
  it("parses numeric values and comparison operators", () => {
    const result = parseFilter("evaluations.intelligence>=20")
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right).toEqual({ field: "evaluations.intelligence", op: ">=", value: 20 })
    }
  })

  it("parses != distinctly from =", () => {
    const result = parseFilter("slug!=a")
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.op).toBe("!=")
      expect(result.right.value).toBe("a")
    }
  })

  it("parses the contains operator ~", () => {
    const result = parseFilter("name~eta")
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result))
      expect(result.right).toEqual({ field: "name", op: "~", value: "eta" })
  })

  it("fails on an unparseable expression", () => {
    const result = parseFilter("no-operator-here")
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("filterRows", () => {
  it("applies numeric comparisons", () => {
    const pred = parseFilter("evaluations.intelligence>=20")
    expect(Either.isRight(pred)).toBe(true)
    if (!Either.isRight(pred)) return
    const filtered = filterRows(rows, [pred.right]) as typeof rows
    expect(filtered.map((r) => r.slug)).toEqual(["b"])
  })

  it("applies case-insensitive contains", () => {
    const pred = parseFilter("name~ALPHA")
    expect(Either.isRight(pred)).toBe(true)
    if (!Either.isRight(pred)) return
    const filtered = filterRows(rows, [pred.right]) as typeof rows
    expect(filtered.map((r) => r.slug)).toEqual(["a"])
  })

  it("combines multiple predicates with AND", () => {
    const preds = [parseFilter("slug!=a"), parseFilter("evaluations.intelligence>=20")].flatMap(
      (r) => (Either.isRight(r) ? [r.right] : []),
    )
    const filtered = filterRows(rows, preds) as typeof rows
    expect(filtered.map((r) => r.slug)).toEqual(["b"])
  })
})
