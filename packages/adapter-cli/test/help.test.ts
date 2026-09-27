// 도움말 스펙(`help-spec.ts`)이 실제 커맨드 정의와 어긋나지 않는지 확인하는 drift-guard,
// 그리고 `help.ts` 렌더링/가로채기 동작 자체에 대한 테스트.
import { BunContext } from "@effect/platform-bun"
import { Effect, Layer } from "effect"
import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { run } from "../src/index.ts"
import { makeCapturingOutput, makeFakeAaApi, makeFakeCache } from "./fixtures.ts"
import {
  commandHelpSpecs,
  groupHelpSpecs,
  knownCommandNames,
  type CommandHelpSpec,
  type OptionGroup,
} from "../src/help-spec.ts"
import { isHelpFlag, renderCommandHelp, renderGroupHelp, resolveHelpTarget } from "../src/help.ts"

const runCli = (argv: ReadonlyArray<string>) => {
  const { captured, layer: outputLayer } = makeCapturingOutput()
  const layer = Layer.mergeAll(makeFakeAaApi({}), makeFakeCache(), outputLayer, BunContext.layer)
  const exitCode = Effect.runSync(run(["bun", "aa", ...argv]).pipe(Effect.provide(layer)))
  return { captured, exitCode }
}

const commandsDir = join(import.meta.dir, "..", "src", "commands")
const readCommandSource = (fileName: string): string =>
  readFileSync(join(commandsDir, fileName), "utf8")

// 스펙 path 의 최상위 세그먼트가 곧 정의 파일 이름이다. `providers`/`cache` 는 서브커맨드를 한 파일에 모아둔다.
const sourceFileFor = (path: ReadonlyArray<string>): string => {
  const top = path[0]
  if (top === undefined) throw new Error("empty spec path")
  return `${top}.ts`
}

// 옵션 그룹 -> 커맨드 정의에서 스프레드하는 마커 문자열.
const groupMarker: Record<OptionGroup, string> = {
  output: "...outputOptions",
  minimalOutput: "...minimalOutputOptions",
  formatOnly: "...formatOnlyOptions",
  fetch: "...fetchOptions",
  free: "...freeOption",
  promptType: "...promptTypeOption",
}

describe("help-spec drift guard", () => {
  it("every command help spec path is a known top-level command", () => {
    for (const spec of commandHelpSpecs) {
      expect(knownCommandNames.includes(sourceFileFor(spec.path).replace(/\.ts$/, ""))).toBe(true)
    }
    for (const spec of groupHelpSpecs) {
      expect(knownCommandNames.includes(sourceFileFor(spec.path).replace(/\.ts$/, ""))).toBe(true)
    }
  })

  it("every optionGroup in a command spec is actually spread in its source file", () => {
    for (const spec of commandHelpSpecs) {
      const source = readCommandSource(sourceFileFor(spec.path))
      for (const group of spec.optionGroups) {
        expect(source).toContain(groupMarker[group])
      }
    }
  })

  it("every ownOption flag in a command spec is a real Options.* declaration in its source", () => {
    for (const spec of commandHelpSpecs) {
      const source = readCommandSource(sourceFileFor(spec.path))
      for (const own of spec.ownOptions) {
        const flagName = own.flag.replace(/^--/, "")
        expect(source).toContain(`"${flagName}"`)
      }
    }
  })

  it("every group spec's subcommand names match a commandHelpSpecs leaf under that path", () => {
    for (const group of groupHelpSpecs) {
      for (const sub of group.subcommands) {
        const leafName = sub.name.split(" ")[0]
        const found = commandHelpSpecs.some(
          (c) => c.path[0] === group.path[0] && c.path[1] === leafName,
        )
        expect(found).toBe(true)
      }
    }
  })
})

const isAscii = (text: string): boolean => !/[\u{AC00}-\u{D7A3}]/u.test(text)

describe("per-command help output", () => {
  it("is <=25 lines and Hangul-free for every registered command", () => {
    for (const spec of commandHelpSpecs) {
      const text = renderCommandHelp(spec)
      expect(text.split("\n").length).toBeLessThanOrEqual(25)
      expect(isAscii(text)).toBe(true)
    }
  })

  it("is <=25 lines and Hangul-free for every group", () => {
    for (const spec of groupHelpSpecs) {
      const text = renderGroupHelp(spec)
      expect(text.split("\n").length).toBeLessThanOrEqual(25)
      expect(isAscii(text)).toBe(true)
    }
  })
})

const findSpec = (path: ReadonlyArray<string>): CommandHelpSpec => {
  const found = commandHelpSpecs.find((s) => s.path.join(" ") === path.join(" "))
  if (found === undefined) throw new Error(`no spec for ${path.join(" ")}`)
  return found
}

describe("resolveHelpTarget", () => {
  it("resolves a leaf command path", () => {
    const target = resolveHelpTarget(["show", "--help"])
    expect(target).toEqual({ kind: "command", spec: findSpec(["show"]) })
  })

  it("resolves a nested command path", () => {
    const target = resolveHelpTarget(["providers", "measurements", "--help"])
    expect(target).toEqual({ kind: "command", spec: findSpec(["providers", "measurements"]) })
  })

  it("resolves a bare group path to group help", () => {
    const target = resolveHelpTarget(["providers", "--help"])
    expect(target?.kind).toBe("group")
  })

  it("finds -h anywhere in argv, after positional and option-like tokens", () => {
    const target = resolveHelpTarget(["show", "sample-model", "--full", "-h"])
    expect(target).toEqual({ kind: "command", spec: findSpec(["show"]) })
  })

  it("finds --help placed before trailing args are given", () => {
    const target = resolveHelpTarget(["find", "--help", "opus"])
    expect(target).toEqual({ kind: "command", spec: findSpec(["find"]) })
  })

  it("falls back to root help for an unrecognized path", () => {
    const target = resolveHelpTarget(["nope", "--help"])
    expect(target).toEqual({ kind: "root" })
  })

  it("returns undefined when neither --help nor -h is present", () => {
    expect(resolveHelpTarget(["show", "sample-model"])).toBeUndefined()
  })

  it("isHelpFlag recognizes both spellings only", () => {
    expect(isHelpFlag("--help")).toBe(true)
    expect(isHelpFlag("-h")).toBe(true)
    expect(isHelpFlag("--h")).toBe(false)
  })
})

describe("group help via run()", () => {
  it("providers --help prints group help on stdout and exits 0", () => {
    const { captured, exitCode } = runCli(["providers", "--help"])
    expect(exitCode).toBe(0)
    const text = captured.stdout.join("\n")
    expect(text).toContain("Commands:")
    expect(text).toContain("measurements")
  })

  it("a bare group (no subcommand, no --help) prints group help on stderr and exits 2", () => {
    const { captured, exitCode } = runCli(["providers"])
    expect(exitCode).toBe(2)
    const text = captured.stderr.join("\n")
    expect(text).toContain("Commands:")
    expect(captured.stdout).toHaveLength(0)
  })

  it("cache with no subcommand prints group help on stderr and exits 2", () => {
    const { captured, exitCode } = runCli(["cache"])
    expect(exitCode).toBe(2)
    expect(captured.stderr.join("\n")).toContain("clear")
  })
})

describe("-h in the middle of argv via run()", () => {
  it("show sample-model -h prints the show command help, not root", () => {
    const { captured, exitCode } = runCli(["show", "sample-model", "-h"])
    expect(exitCode).toBe(0)
    const text = captured.stdout.join("\n")
    expect(text).toContain("aa-cli show <query>")
  })

  it("providers measurements openai -h prints the nested command help", () => {
    const { captured, exitCode } = runCli(["providers", "measurements", "openai", "-h"])
    expect(exitCode).toBe(0)
    const text = captured.stdout.join("\n")
    expect(text).toContain("aa-cli providers measurements <slug>")
  })
})
