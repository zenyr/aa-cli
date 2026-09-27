import { describe, expect, test } from "bun:test"
import { BunContext } from "@effect/platform-bun"
import { ConfigProvider, Effect } from "effect"
import { resolveCacheDir } from "../src/resolve-cache-dir.ts"

const runWithEnv = (env: Record<string, string>) =>
  Effect.runPromise(
    resolveCacheDir.pipe(
      Effect.withConfigProvider(ConfigProvider.fromMap(new Map(Object.entries(env)))),
      Effect.provide(BunContext.layer),
    ),
  )

describe("resolveCacheDir", () => {
  test("AA_CACHE_DIR takes priority", async () => {
    const dir = await runWithEnv({
      AA_CACHE_DIR: "/tmp/aa-cache-dir",
      XDG_CACHE_HOME: "/tmp/xdg",
      HOME: "/tmp/home",
    })
    expect(dir).toBe("/tmp/aa-cache-dir")
  })

  test("falls back to XDG_CACHE_HOME/aa-cli", async () => {
    const dir = await runWithEnv({ XDG_CACHE_HOME: "/tmp/xdg", HOME: "/tmp/home" })
    expect(dir).toBe("/tmp/xdg/aa-cli")
  })

  test("falls back to HOME/.cache/aa-cli", async () => {
    const dir = await runWithEnv({ HOME: "/tmp/home" })
    expect(dir).toBe("/tmp/home/.cache/aa-cli")
  })

  test("falls back to os tmpdir/aa-cli when nothing is set", async () => {
    const dir = await runWithEnv({})
    expect(dir.endsWith("/aa-cli")).toBe(true)
  })
})
