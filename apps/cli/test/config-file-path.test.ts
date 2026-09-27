import { describe, expect, test } from "bun:test"
import { resolveConfigFilePath } from "../src/config-file-path.ts"

describe("resolveConfigFilePath", () => {
  test("AA_CONFIG_FILE takes priority", () => {
    const path = resolveConfigFilePath({
      AA_CONFIG_FILE: "/tmp/custom.env",
      XDG_CONFIG_HOME: "/tmp/xdg",
      HOME: "/tmp/home",
    })
    expect(path).toBe("/tmp/custom.env")
  })

  test("falls back to XDG_CONFIG_HOME/aa-cli/.env", () => {
    const path = resolveConfigFilePath({ XDG_CONFIG_HOME: "/tmp/xdg", HOME: "/tmp/home" })
    expect(path).toBe("/tmp/xdg/aa-cli/.env")
  })

  test("falls back to HOME/.config/aa-cli/.env", () => {
    const path = resolveConfigFilePath({ HOME: "/tmp/home" })
    expect(path).toBe("/tmp/home/.config/aa-cli/.env")
  })

  test("returns undefined when nothing is set", () => {
    const path = resolveConfigFilePath({})
    expect(path).toBeUndefined()
  })
})
