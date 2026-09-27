// 데이터 커맨드가 조합해서 쓰는 CLI 옵션 그룹.
import { PromptType } from "@aa/domain"
import { Options } from "@effect/cli"
import { Option } from "effect"
import type { Format } from "./format/index.ts"

const formatChoice = Options.choice("format", ["json", "jsonl", "table", "tsv", "md"]).pipe(
  Options.optional,
  Options.withDescription("Output format (default: table on TTY, json when piped)"),
)

const jsonFlag = Options.boolean("json").pipe(
  Options.withDefault(false),
  Options.withDescription("Alias for --format json"),
)

const fields = Options.text("fields").pipe(
  Options.optional,
  Options.withDescription("Comma-separated field projection, e.g. slug,name,pricing.input"),
)

const full = Options.boolean("full").pipe(
  Options.withDefault(false),
  Options.withDescription("All fields instead of the summary set"),
)

const limit = Options.integer("limit").pipe(
  Options.optional,
  Options.withDescription("Limit the number of result rows"),
)

const sort = Options.text("sort").pipe(
  Options.optional,
  Options.withDescription("Sort spec, e.g. -intelligence"),
)

// `Options.repeated` 는 기본적으로 필수 인자처럼 렌더링되므로 `Options.optional` 로 감싸서
// 도움말에 선택/반복 가능임을 드러내고, 값이 없으면 빈 배열로 되돌린다.
const filter = Options.text("filter").pipe(
  Options.repeated,
  Options.optional,
  Options.map(Option.getOrElse((): ReadonlyArray<string> => [])),
  Options.withDescription("Filter expression (repeatable), e.g. pricing.input<1"),
)

const noCache = Options.boolean("no-cache").pipe(
  Options.withDefault(false),
  Options.withDescription("Bypass the cache and fetch fresh"),
)

const offline = Options.boolean("offline").pipe(
  Options.withDefault(false),
  Options.withDescription("Use only cached values; fail if missing"),
)

const ttl = Options.integer("ttl").pipe(
  Options.optional,
  Options.withDescription("Cache TTL in seconds"),
)

const free = Options.boolean("free").pipe(
  Options.withDefault(false),
  Options.withDescription("Force a free-tier response"),
)

const promptType = Options.choice("prompt-type", PromptType.literals).pipe(
  Options.optional,
  Options.withDescription("Evaluation prompt type"),
)

// --format/--json/--fields/--full/--limit/--sort/--filter: 대부분의 목록/단건 조회 커맨드가 쓴다.
export const outputOptions = {
  format: formatChoice,
  json: jsonFlag,
  fields,
  full,
  limit,
  sort,
  filter,
}

export type OutputOptionsValue = {
  readonly format: Option.Option<Format>
  readonly json: boolean
  readonly fields: Option.Option<string>
  readonly full: boolean
  readonly limit: Option.Option<number>
  readonly sort: Option.Option<string>
  readonly filter: ReadonlyArray<string>
}

// quota / endpoints 처럼 정렬·필터·limit 이 의미 없는 정적/캐시 전용 커맨드용 최소 출력 옵션.
export const minimalOutputOptions = { format: formatChoice, json: jsonFlag, fields }

export type MinimalOutputOptionsValue = {
  readonly format: Option.Option<Format>
  readonly json: boolean
  readonly fields: Option.Option<string>
}

// cache clear 처럼 필드 프로젝션도 없는 커맨드용 출력 옵션.
export const formatOnlyOptions = { format: formatChoice, json: jsonFlag }

export type FormatOnlyOptionsValue = {
  readonly format: Option.Option<Format>
  readonly json: boolean
}

// --no-cache/--offline/--ttl: 원격 조회가 있는 모든 커맨드가 쓴다.
export const fetchOptions = { noCache, offline, ttl }

export type FetchOptionsValue = {
  readonly noCache: boolean
  readonly offline: boolean
  readonly ttl: Option.Option<number>
}

// --free: 언어 모델/미디어 커맨드의 티어 강제 옵션.
export const freeOption = { free }

export type FreeOptionValue = { readonly free: boolean }

// --prompt-type: 언어 모델/provider 커맨드의 평가 프롬프트 옵션.
export const promptTypeOption = { promptType }

export type PromptTypeOptionValue = { readonly promptType: Option.Option<PromptType> }

// `--format` / `--json` / TTY 감지를 하나의 규칙으로 합친다.
export const resolveFormat = (v: FormatOnlyOptionsValue, isTTY: boolean): Format => {
  if (v.json) return "json"
  if (Option.isSome(v.format)) return v.format.value
  return isTTY ? "table" : "json"
}

// `--no-cache` / `--offline` 을 application 의 CacheMode 로 변환.
export const resolveCacheMode = (v: FetchOptionsValue): "use" | "bypass" | "only" => {
  if (v.offline) return "only"
  if (v.noCache) return "bypass"
  return "use"
}

// `--free` 가 없으면 키를 비워서 application 의 티어 기억/폴백이 동작하게 한다.
export const freeOptOf = (v: FreeOptionValue): { readonly free?: true } =>
  v.free ? { free: true } : {}
