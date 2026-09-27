import { describe, expect, it } from "bun:test"
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
