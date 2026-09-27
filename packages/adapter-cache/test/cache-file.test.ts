import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { FileSystem, Path } from "@effect/platform"
import { BunContext } from "@effect/platform-bun"
import { Cache } from "@aa/domain"
import { ConfigProvider, Effect, Option, TestClock, TestContext } from "effect"
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createHash } from "node:crypto"
import { CacheFileLive } from "../src/cache-file.ts"

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "aa-cache-test-"))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const runTest = <A>(effect: Effect.Effect<A, never, Cache | FileSystem.FileSystem | Path.Path>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(CacheFileLive),
      Effect.provide(BunContext.layer),
      Effect.provide(TestContext.TestContext),
      Effect.withConfigProvider(ConfigProvider.fromMap(new Map([["AA_CACHE_DIR", dir]]))),
    ),
  )

describe("CacheFileLive", () => {
  test("set then get returns the stored value", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const cache = yield* Cache
        yield* cache.set("key-1", { hello: "world" }, 60)
        return yield* cache.get("key-1")
      }),
    )
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value.value).toEqual({ hello: "world" })
    }
  })

  test("get returns none for a missing key", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const cache = yield* Cache
        return yield* cache.get("missing")
      }),
    )
    expect(Option.isNone(result)).toBe(true)
  })

  test("get returns none once the entry expires", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const cache = yield* Cache
        yield* cache.set("expiring", "value", 10)
        yield* TestClock.adjust("11 seconds")
        return yield* cache.get("expiring")
      }),
    )
    expect(Option.isNone(result)).toBe(true)
  })

  test("get returns none for a corrupt file", async () => {
    const key = "corrupt"
    const hash = createHash("sha256").update(key).digest("hex")
    const httpDir = join(dir, "http")
    mkdirSync(httpDir, { recursive: true })
    writeFileSync(join(httpDir, `${hash}.json`), "{ not valid json")

    const result = await runTest(
      Effect.gen(function* () {
        const cache = yield* Cache
        return yield* cache.get(key)
      }),
    )
    expect(Option.isNone(result)).toBe(true)
  })

  test("clear removes all entries", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const cache = yield* Cache
        yield* cache.set("a", 1, 60)
        yield* cache.clear()
        return yield* cache.get("a")
      }),
    )
    expect(Option.isNone(result)).toBe(true)
  })

  test("quota round trip", async () => {
    const snapshot = {
      tier: "free" as const,
      rateLimit: { limit: 100, remaining: 42, reset: 1234 },
      observedAt: 5678,
    }
    const result = await runTest(
      Effect.gen(function* () {
        const cache = yield* Cache
        yield* cache.setRateLimit(snapshot)
        return yield* cache.getRateLimit()
      }),
    )
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value).toEqual(snapshot)
    }
  })

  test("getRateLimit returns none when nothing was stored", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const cache = yield* Cache
        return yield* cache.getRateLimit()
      }),
    )
    expect(Option.isNone(result)).toBe(true)
  })
})
