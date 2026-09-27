// 커맨드 도움말을 위한 선언적 데이터. 루트 도움말과 커맨드별 도움말이 모두 이 배열에서 생성되어
// 서로 어긋나지 않는다. `@effect/cli` 의 기본 렌더링은 여기서 전혀 쓰지 않는다.
import {
  fetchOptionFlags,
  formatOnlyOptionFlags,
  freeOptionFlags,
  minimalOutputOptionFlags,
  outputOptionFlags,
  promptTypeOptionFlags,
} from "./global-options.ts"

export type OptionGroup =
  | "output"
  | "minimalOutput"
  | "formatOnly"
  | "fetch"
  | "free"
  | "promptType"

// 옵션 그룹 이름 -> 실제로 붙는 플래그 이름 배열.
export const optionGroupFlags: Record<OptionGroup, ReadonlyArray<string>> = {
  output: outputOptionFlags,
  minimalOutput: minimalOutputOptionFlags,
  formatOnly: formatOnlyOptionFlags,
  fetch: fetchOptionFlags,
  free: freeOptionFlags,
  promptType: promptTypeOptionFlags,
}

// 공통 플래그를 도움말에 보여줄 때 붙이는 값 힌트.
export const flagDisplay: Readonly<Record<string, string>> = {
  "--format": "--format json|jsonl|table|tsv|md",
  "--fields": "--fields a,b.c",
  "--limit": "--limit N",
  "--sort": "--sort -field",
  "--filter": "--filter expr...",
  "--ttl": "--ttl SECONDS",
  "--prompt-type":
    "--prompt-type medium|long|100k|vision_single_image|medium_coding|medium_parallel",
}

// 커맨드 고유 옵션 하나: 도움말에 보여줄 플래그 이름과 한 줄 표시 텍스트.
export interface OwnOption {
  readonly flag: string
  readonly display: string
}

// 리프(실행 가능) 커맨드 하나의 도움말 스펙.
export interface CommandHelpSpec {
  readonly path: ReadonlyArray<string>
  readonly usageArgs: string
  readonly summary: string
  readonly optionGroups: ReadonlyArray<OptionGroup>
  readonly ownOptions: ReadonlyArray<OwnOption>
  readonly examples: ReadonlyArray<string>
}

// 그룹 커맨드(서브커맨드가 있고 그 자체로는 실행되지 않는 커맨드) 하나의 도움말 스펙.
export interface GroupHelpSpec {
  readonly path: ReadonlyArray<string>
  readonly summary: string
  readonly subcommands: ReadonlyArray<{ readonly name: string; readonly summary: string }>
  readonly examples: ReadonlyArray<string>
}

export const commandHelpSpecs: ReadonlyArray<CommandHelpSpec> = [
  {
    path: ["find"],
    usageArgs: "<words...>",
    summary: "Search language models by name. Returns ranked candidates.",
    optionGroups: ["output", "fetch", "free", "promptType"],
    ownOptions: [],
    examples: [
      "aa-cli find opus 5.5",
      "aa-cli find gpt 6 --fields slug,evaluations.artificial_analysis_intelligence_index",
    ],
  },
  {
    path: ["show"],
    usageArgs: "<query>",
    summary: 'One language model. Query may be a slug or a name, e.g. "opus 5.5".',
    optionGroups: ["output", "fetch", "promptType"],
    ownOptions: [],
    examples: [
      'aa-cli show "opus 5.5"',
      "aa-cli show claude-opus-5-5 --fields slug,pricing.price_1m_input_tokens",
    ],
  },
  {
    path: ["perf"],
    usageArgs: "<query>",
    summary: "Language model performance history over time. Requires the commercial tier.",
    optionGroups: ["output", "fetch", "promptType"],
    ownOptions: [
      { flag: "--window", display: "--window 7d|30d|90d" },
      { flag: "--interval", display: "--interval daily|weekly|monthly" },
    ],
    examples: ['aa-cli perf "opus 5.5" --window 30d --interval daily'],
  },
  {
    path: ["compare"],
    usageArgs: "<query>...",
    summary: "Compare two or more language models side by side.",
    optionGroups: ["output", "fetch", "free", "promptType"],
    ownOptions: [],
    examples: ['aa-cli compare "opus 5.5" "opus 5" --fields slug,pricing.price_1m_input_tokens'],
  },
  {
    path: ["list"],
    usageArgs: "",
    summary: "List all language models.",
    optionGroups: ["output", "fetch", "free", "promptType"],
    ownOptions: [
      { flag: "--all-pages", display: "--all-pages" },
      { flag: "--page", display: "--page N" },
    ],
    examples: ["aa-cli list --sort -evaluations.artificial_analysis_intelligence_index --limit 10"],
  },
  {
    path: ["media"],
    usageArgs: "<kind>",
    summary: "Media arena rankings (text-to-image, text-to-video, ...).",
    optionGroups: ["output", "fetch", "free"],
    ownOptions: [
      { flag: "--categories", display: "--categories" },
      { flag: "--genres", display: "--genres" },
    ],
    examples: ["aa-cli media text-to-image"],
  },
  {
    path: ["providers", "list"],
    usageArgs: "",
    summary: "List API providers. Requires the commercial tier.",
    optionGroups: ["output", "fetch", "promptType"],
    ownOptions: [{ flag: "--all-pages", display: "--all-pages" }],
    examples: ["aa-cli providers list"],
  },
  {
    path: ["providers", "show"],
    usageArgs: "<slug>",
    summary: "One API provider. Requires the commercial tier.",
    optionGroups: ["output", "fetch", "promptType"],
    ownOptions: [],
    examples: ["aa-cli providers show openai"],
  },
  {
    path: ["providers", "perf"],
    usageArgs: "<slug>",
    summary: "Provider performance history over time. Requires the commercial tier.",
    optionGroups: ["output", "fetch", "promptType"],
    ownOptions: [
      { flag: "--window", display: "--window 7d|30d|90d" },
      { flag: "--interval", display: "--interval daily|weekly|monthly" },
    ],
    examples: ["aa-cli providers perf openai --window 90d"],
  },
  {
    path: ["providers", "measurements"],
    usageArgs: "<slug>",
    summary: "Raw provider measurements. Requires per-account approval (commercial).",
    optionGroups: ["output", "fetch", "promptType"],
    ownOptions: [{ flag: "--start-date", display: "--start-date YYYY-MM-DD" }],
    examples: ["aa-cli providers measurements openai --start-date 2026-01-01"],
  },
  {
    path: ["quota"],
    usageArgs: "",
    summary: "Last observed rate limit. Reads only the cache, never calls the API.",
    optionGroups: ["minimalOutput"],
    ownOptions: [],
    examples: ["aa-cli quota"],
  },
  {
    path: ["endpoints"],
    usageArgs: "",
    summary: "Supported endpoints and their required tiers (static catalog).",
    optionGroups: ["minimalOutput"],
    ownOptions: [],
    examples: ["aa-cli endpoints"],
  },
  {
    path: ["schema"],
    usageArgs: "<command...>",
    summary: "JSON Schema of a command's data output.",
    optionGroups: [],
    ownOptions: [],
    examples: ["aa-cli schema list", "aa-cli schema providers show"],
  },
  {
    path: ["raw"],
    usageArgs: "<path>",
    summary: "Escape hatch: an arbitrary GET against the API, response shape not enforced.",
    optionGroups: ["output", "fetch"],
    ownOptions: [{ flag: "--query", display: "--query k=v (repeatable)" }],
    examples: ["aa-cli raw /language/models/free"],
  },
  {
    path: ["cache", "clear"],
    usageArgs: "",
    summary: "Clear the local cache (default: responses+tier, --quota: tier only).",
    optionGroups: ["formatOnly"],
    ownOptions: [{ flag: "--quota", display: "--quota" }],
    examples: ["aa-cli cache clear", "aa-cli cache clear --quota"],
  },
]

export const groupHelpSpecs: ReadonlyArray<GroupHelpSpec> = [
  {
    path: ["providers"],
    summary: "API providers: list, single lookup, performance, measurements.",
    subcommands: [
      { name: "list", summary: "List API providers" },
      { name: "show <slug>", summary: "One API provider" },
      { name: "perf <slug>", summary: "Provider performance history (commercial)" },
      { name: "measurements <slug>", summary: "Raw provider measurements (commercial)" },
    ],
    examples: ["aa-cli providers list", "aa-cli providers show openai"],
  },
  {
    path: ["cache"],
    summary: "Manage the local cache.",
    subcommands: [{ name: "clear", summary: "Clear local cache / remembered tier" }],
    examples: ["aa-cli cache clear"],
  },
]

// `aa-cli --help` 의 Commands 섹션 한 줄. 그룹은 서브커맨드를 압축해 하나로 보여준다.
export interface RootMenuEntry {
  readonly label: string
  readonly summary: string
}

export const rootMenu: ReadonlyArray<RootMenuEntry> = [
  { label: "find <words...>", summary: "Search language models by name (ranked candidates)" },
  { label: "show <query>", summary: 'One language model (query may be a name: "opus 5.5")' },
  { label: "perf <query>", summary: "Model performance over time (commercial)" },
  { label: "compare <query>...", summary: "Language models side by side" },
  { label: "list", summary: "All language models" },
  {
    label: "media <kind>",
    summary: "Media arena rankings (text-to-image, text-to-video, ...)",
  },
  {
    label: "providers list|show|perf|measurements <slug>",
    summary: "API providers (commercial tier)",
  },
  { label: "quota", summary: "Last observed rate limit (no request)" },
  { label: "endpoints", summary: "Supported endpoints and required tiers" },
  { label: "schema <command...>", summary: "JSON Schema of a command's data output" },
  { label: "raw <path>", summary: "Arbitrary GET (escape hatch)" },
  { label: "cache clear [--quota]", summary: "Clear local cache / remembered tier" },
]

// 최상위 서브커맨드 이름. 그룹은 그룹 이름 하나만 등록한다 (`providers`, `cache`).
export const knownCommandNames: ReadonlyArray<string> = [
  "find",
  "show",
  "perf",
  "compare",
  "list",
  "media",
  "providers",
  "quota",
  "endpoints",
  "schema",
  "raw",
  "cache",
]
