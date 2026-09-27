import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { Config, ConfigProvider, Effect } from "effect"
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildConfigProvider } from "../src/config-provider.ts"

let dir: string
let stderrLines: Array<string>
let originalConsoleError: typeof console.error

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "aa-cli-config-test-"))
  stderrLines = []
  originalConsoleError = console.error
  console.error = (message: string) => {
    stderrLines.push(message)
  }
})

afterEach(() => {
  console.error = originalConsoleError
  rmSync(dir, { recursive: true, force: true })
})

const fakeEnvProvider = (entries: Record<string, string>): ConfigProvider.ConfigProvider =>
  ConfigProvider.fromMap(new Map(Object.entries(entries)))

describe("buildConfigProvider", () => {
  test("environment variable wins over the config file", async () => {
    const configPath = join(dir, ".env")
    writeFileSync(configPath, "AA_APIKEY=from-file\n")
    chmodSync(configPath, 0o600)

    const provider = buildConfigProvider({
      env: { AA_CONFIG_FILE: configPath },
      envProvider: fakeEnvProvider({ AA_APIKEY: "from-env" }),
    })
    const value = await Effect.runPromise(
      Config.string("AA_APIKEY").pipe(Effect.withConfigProvider(provider)),
    )
    expect(value).toBe("from-env")
  })

  test("falls back to the config file when the env var is absent", async () => {
    const configPath = join(dir, ".env")
    writeFileSync(configPath, "AA_APIKEY=from-file\n")
    chmodSync(configPath, 0o600)

    const provider = buildConfigProvider({
      env: { AA_CONFIG_FILE: configPath },
      envProvider: fakeEnvProvider({}),
    })
    const value = await Effect.runPromise(
      Config.string("AA_APIKEY").pipe(Effect.withConfigProvider(provider)),
    )
    expect(value).toBe("from-file")
  })

  test("silently ignores a missing config file", async () => {
    const provider = buildConfigProvider({
      env: { AA_CONFIG_FILE: join(dir, "does-not-exist.env") },
      envProvider: fakeEnvProvider({}),
    })
    const result = await Effect.runPromise(
      Config.string("AA_APIKEY").pipe(Effect.option, Effect.withConfigProvider(provider)),
    )
    expect(result._tag).toBe("None")
    expect(stderrLines.some((line) => line.includes("warning"))).toBe(false)
  })

  test("warns on stderr when the config file is readable by others", async () => {
    const configPath = join(dir, ".env")
    writeFileSync(configPath, "AA_APIKEY=secret\n")
    chmodSync(configPath, 0o644)

    const provider = buildConfigProvider({
      env: { AA_CONFIG_FILE: configPath },
      envProvider: fakeEnvProvider({}),
    })
    await Effect.runPromise(Config.string("AA_APIKEY").pipe(Effect.withConfigProvider(provider)))

    expect(stderrLines.length).toBe(1)
    expect(stderrLines[0]).toContain(configPath)
    expect(stderrLines[0]).toContain("chmod 600")
    expect(stderrLines[0]).not.toContain("secret")
  })

  test("does not warn when the config file is chmod 600", async () => {
    const configPath = join(dir, ".env")
    writeFileSync(configPath, "AA_APIKEY=secret\n")
    chmodSync(configPath, 0o600)

    const provider = buildConfigProvider({
      env: { AA_CONFIG_FILE: configPath },
      envProvider: fakeEnvProvider({}),
    })
    await Effect.runPromise(Config.string("AA_APIKEY").pipe(Effect.withConfigProvider(provider)))

    expect(stderrLines.length).toBe(0)
  })
})
