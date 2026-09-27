// 데이터 커맨드 공통 CLI 옵션.
import { Options } from "@effect/cli"
import { Option } from "effect"
import type { Format } from "./format/index.ts"

const formatChoice = Options.choice("format", ["json", "jsonl", "table", "tsv", "md"]).pipe(
  Options.optional,
  Options.withDescription("출력 형식 (기본: TTY 면 table, 파이프면 json)"),
)

const jsonFlag = Options.boolean("json").pipe(
  Options.withDefault(false),
  Options.withDescription("--format json 별칭"),
)

const fields = Options.text("fields").pipe(
  Options.optional,
  Options.withDescription("쉼표로 구분한 필드 프로젝션, 예: slug,name,pricing.input"),
)

const full = Options.boolean("full").pipe(
  Options.withDefault(false),
  Options.withDescription("요약 필드 대신 전체 필드"),
)

const limit = Options.integer("limit").pipe(
  Options.optional,
  Options.withDescription("결과 행 수 제한"),
)

const sort = Options.text("sort").pipe(
  Options.optional,
  Options.withDescription("정렬 스펙, 예: -intelligence"),
)

const filter = Options.text("filter").pipe(
  Options.repeated,
  Options.withDescription("필터 표현식 (반복 가능), 예: pricing.input<1"),
)

const noCache = Options.boolean("no-cache").pipe(
  Options.withDefault(false),
  Options.withDescription("캐시를 우회하고 새로 요청"),
)

const offline = Options.boolean("offline").pipe(
  Options.withDefault(false),
  Options.withDescription("캐시에 있는 값만 사용, 없으면 실패"),
)

const ttl = Options.integer("ttl").pipe(Options.optional, Options.withDescription("캐시 TTL(초)"))

const free = Options.boolean("free").pipe(
  Options.withDefault(false),
  Options.withDescription("free 티어 응답 강제 조회"),
)

const promptType = Options.text("prompt-type").pipe(
  Options.optional,
  Options.withDescription("평가 프롬프트 종류, 예: long"),
)

// 데이터 조회 커맨드에서 공통으로 쓰는 옵션 묶음.
export const dataOptions = {
  format: formatChoice,
  json: jsonFlag,
  fields,
  full,
  limit,
  sort,
  filter,
  noCache,
  offline,
  ttl,
  free,
  promptType,
}

export type DataOptionsValue = {
  readonly format: Option.Option<Format>
  readonly json: boolean
  readonly fields: Option.Option<string>
  readonly full: boolean
  readonly limit: Option.Option<number>
  readonly sort: Option.Option<string>
  readonly filter: ReadonlyArray<string>
  readonly noCache: boolean
  readonly offline: boolean
  readonly ttl: Option.Option<number>
  readonly free: boolean
  readonly promptType: Option.Option<string>
}

// `--format` / `--json` / TTY 감지를 하나의 규칙으로 합친다.
export const resolveFormat = (v: DataOptionsValue, isTTY: boolean): Format => {
  if (v.json) return "json"
  if (Option.isSome(v.format)) return v.format.value
  return isTTY ? "table" : "json"
}

// `--no-cache` / `--offline` 을 application 의 CacheMode 로 변환.
export const resolveCacheMode = (v: DataOptionsValue): "use" | "bypass" | "only" => {
  if (v.offline) return "only"
  if (v.noCache) return "bypass"
  return "use"
}
