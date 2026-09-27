import { describe, expect, test } from "bun:test"
import { parseDotenv } from "../src/dotenv-parser.ts"

describe("parseDotenv", () => {
  test("parses simple KEY=VALUE lines", () => {
    const map = parseDotenv("AA_APIKEY=secret123\nOTHER=value")
    expect(map.get("AA_APIKEY")).toBe("secret123")
    expect(map.get("OTHER")).toBe("value")
  })

  test("ignores blank lines and comments", () => {
    const map = parseDotenv("\n# a comment\n\nAA_APIKEY=secret\n  # another comment\n")
    expect(map.size).toBe(1)
    expect(map.get("AA_APIKEY")).toBe("secret")
  })

  test("strips optional surrounding double or single quotes", () => {
    const map = parseDotenv("A=\"double\"\nB='single'\nC=bare")
    expect(map.get("A")).toBe("double")
    expect(map.get("B")).toBe("single")
    expect(map.get("C")).toBe("bare")
  })

  test("allows an export prefix", () => {
    const map = parseDotenv("export AA_APIKEY=secret")
    expect(map.get("AA_APIKEY")).toBe("secret")
  })

  test("keeps '=' characters found inside the value", () => {
    const map = parseDotenv("KEY=a=b=c")
    expect(map.get("KEY")).toBe("a=b=c")
  })

  test("skips lines without a key", () => {
    const map = parseDotenv("=novalue\n=")
    expect(map.size).toBe(0)
  })

  test("returns an empty map for empty content", () => {
    const map = parseDotenv("")
    expect(map.size).toBe(0)
  })
})
