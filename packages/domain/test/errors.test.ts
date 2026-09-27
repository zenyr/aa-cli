import { describe, expect, it } from "bun:test"
import { RateLimit } from "../src/response-meta.ts"
import {
  AuthError,
  BadRequest,
  DecodeError,
  NetworkError,
  NotFound,
  RateLimited,
  ServerError,
  TierError,
  UsageError,
  errorCodeOf,
  exitCodeOf,
  observedQuotaOf,
} from "../src/errors.ts"

describe("exitCodeOf", () => {
  it("maps each error tag to the README exit-code table", () => {
    expect(exitCodeOf(new NetworkError({ message: "x" }))).toBe(1)
    expect(exitCodeOf(new DecodeError({ message: "x" }))).toBe(1)
    expect(exitCodeOf(new ServerError({ message: "x" }))).toBe(1)
    expect(exitCodeOf(new UsageError({ message: "x" }))).toBe(2)
    expect(exitCodeOf(new BadRequest({ message: "x" }))).toBe(2)
    expect(exitCodeOf(new AuthError({ message: "x" }))).toBe(3)
    expect(exitCodeOf(new TierError({ message: "x" }))).toBe(4)
    expect(exitCodeOf(new NotFound({ message: "x" }))).toBe(5)
    expect(exitCodeOf(new RateLimited({ message: "x" }))).toBe(6)
  })
})

describe("errorCodeOf", () => {
  it("returns the short string code used in JSON error output", () => {
    expect(errorCodeOf(new TierError({ message: "x" }))).toBe("tier")
    expect(errorCodeOf(new RateLimited({ message: "x" }))).toBe("rate_limited")
    expect(errorCodeOf(new NotFound({ message: "x" }))).toBe("not_found")
  })
})

describe("observedQuotaOf", () => {
  it("extracts tier and rateLimit when present on an HTTP-originated error", () => {
    const rateLimit = new RateLimit({ limit: 100, remaining: 0, reset: 1790000000 })
    const error = new TierError({ message: "x", tier: "free", rateLimit })
    expect(observedQuotaOf(error)).toEqual({ tier: "free", rateLimit })
  })

  it("returns nulls when the error carries no observed quota", () => {
    expect(observedQuotaOf(new NotFound({ message: "x" }))).toEqual({
      tier: null,
      rateLimit: null,
    })
  })

  it("returns nulls for non-HTTP errors", () => {
    expect(observedQuotaOf(new NetworkError({ message: "x" }))).toEqual({
      tier: null,
      rateLimit: null,
    })
    expect(observedQuotaOf(new UsageError({ message: "x" }))).toEqual({
      tier: null,
      rateLimit: null,
    })
  })
})
