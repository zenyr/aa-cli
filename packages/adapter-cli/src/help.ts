// `help-spec.ts` 데이터로부터 루트/그룹/커맨드 도움말을 렌더링하고, argv 경계에서
// `--help`/`-h` 를 가로챈다. `@effect/cli` 기본 렌더링은 여기서 전혀 거치지 않는다.
import {
  commandHelpSpecs,
  groupHelpSpecs,
  flagDisplay,
  optionGroupFlags,
  type CommandHelpSpec,
  type GroupHelpSpec,
} from "./help-spec.ts"

export const isHelpFlag = (token: string): boolean => token === "--help" || token === "-h"

// 옵션처럼 보이는 토큰(`-` 로 시작) 이전까지의 위치 인자만 커맨드 경로 후보로 본다.
const positionalPrefix = (tokens: ReadonlyArray<string>): ReadonlyArray<string> => {
  const idx = tokens.findIndex((t) => t.startsWith("-"))
  return idx === -1 ? tokens : tokens.slice(0, idx)
}

// `tokens` 의 접두사 중 스펙에 등록된 가장 긴 경로를 찾는다.
const longestMatch = <T extends { readonly path: ReadonlyArray<string> }>(
  tokens: ReadonlyArray<string>,
  specs: ReadonlyArray<T>,
): T | undefined => {
  for (let len = tokens.length; len > 0; len--) {
    const prefix = tokens.slice(0, len).join(" ")
    const found = specs.find((s) => s.path.join(" ") === prefix)
    if (found !== undefined) return found
  }
  return undefined
}

export type HelpTarget =
  | { readonly kind: "root" }
  | { readonly kind: "command"; readonly spec: CommandHelpSpec }
  | { readonly kind: "group"; readonly spec: GroupHelpSpec }

// argv (프로그램/스크립트 이름을 뺀 사용자 인자) 에서 `--help`/`-h` 의 첫 위치를 찾고,
// 그 앞의 위치 인자로 가장 긴 커맨드/그룹 경로를 해석한다. 못 찾으면 루트 도움말로 떨어진다.
export const resolveHelpTarget = (userArgs: ReadonlyArray<string>): HelpTarget | undefined => {
  const helpIdx = userArgs.findIndex(isHelpFlag)
  if (helpIdx === -1) return undefined
  const candidate = positionalPrefix(userArgs.slice(0, helpIdx))
  if (candidate.length === 0) return { kind: "root" }
  const command = longestMatch(candidate, commandHelpSpecs)
  if (command !== undefined) return { kind: "command", spec: command }
  const group = longestMatch(candidate, groupHelpSpecs)
  if (group !== undefined) return { kind: "group", spec: group }
  return { kind: "root" }
}

const optionLines = (spec: CommandHelpSpec): ReadonlyArray<string> => {
  const groupFlagLines = spec.optionGroups.map(
    (g) => `  ${optionGroupFlags[g].map((f) => flagDisplay[f] ?? f).join("   ")}`,
  )
  const ownFlagLine =
    spec.ownOptions.length === 0 ? [] : [`  ${spec.ownOptions.map((o) => o.display).join("   ")}`]
  return [...groupFlagLines, ...ownFlagLine]
}

// 리프 커맨드 하나의 도움말. ≤25 줄, 영문, ANSI 없음.
export const renderCommandHelp = (spec: CommandHelpSpec): string => {
  const usage =
    spec.usageArgs.length === 0 ? spec.path.join(" ") : `${spec.path.join(" ")} ${spec.usageArgs}`
  const lines: Array<string> = [`aa-cli ${usage}`, "", spec.summary]
  if (spec.args.length > 0) {
    const width = Math.max(...spec.args.map((a) => a.name.length))
    lines.push(
      "",
      "Arguments:",
      ...spec.args.map((a) => `  ${a.name.padEnd(width)}   ${a.description}`),
    )
  }
  const options = optionLines(spec)
  if (options.length > 0) lines.push("", "Options:", ...options)
  lines.push("", "Examples:", ...spec.examples.map((e) => `  ${e}`))
  return lines.join("\n")
}

// 그룹 커맨드(서브커맨드가 있는 커맨드) 하나의 도움말. 서브커맨드 목록만 보여준다.
export const renderGroupHelp = (spec: GroupHelpSpec): string => {
  const width = Math.max(...spec.subcommands.map((s) => s.name.length))
  const lines: Array<string> = [
    `aa-cli ${spec.path.join(" ")} <command>`,
    "",
    spec.summary,
    "",
    "Commands:",
    ...spec.subcommands.map((s) => `  ${s.name.padEnd(width)}   ${s.summary}`),
    "",
    "Examples:",
    ...spec.examples.map((e) => `  ${e}`),
  ]
  return lines.join("\n")
}
