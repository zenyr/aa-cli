import { NotFound, TierError, exitCodeOf } from "@aa/domain"
import { describe, expect, it } from "bun:test"
import { formatError, formatErrorHuman, formatErrorJson } from "../src/format/error.ts"

describe("formatErrorJson", () => {
  it("renders code, message, hint and status", () => {
    const e = new TierError({ message: "pro required", status: 403, hint: "try --free" })
    const parsed = JSON.parse(formatErrorJson(e))
    expect(parsed).toEqual({
      error: { code: "tier", message: "pro required", hint: "try --free", status: 403 },
    })
    expect(exitCodeOf(e)).toBe(4)
  })

  it("uses null for absent hint/status", () => {
    const e = new NotFound({ message: "no such slug" })
    const parsed = JSON.parse(formatErrorJson(e))
    expect(parsed.error.hint).toBeNull()
    expect(parsed.error.status).toBeNull()
  })
})

describe("formatErrorHuman", () => {
  it("renders a one-line message plus a hint line", () => {
    const e = new TierError({ message: "pro required", hint: "try --free" })
    expect(formatErrorHuman(e)).toEqual(["aa: tier: pro required", "hint: try --free"])
  })

  it("omits the hint line when absent", () => {
    const e = new NotFound({ message: "no such slug" })
    expect(formatErrorHuman(e)).toEqual(["aa: not_found: no such slug"])
  })
})

describe("formatError", () => {
  it("dispatches on format", () => {
    const e = new NotFound({ message: "x" })
    expect(formatError("json", e)[0]).toContain('"code":"not_found"')
    expect(formatError("table", e)).toEqual(["aa: not_found: x"])
  })
})
