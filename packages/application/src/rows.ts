import { UsageError } from "@aa/domain"
import { Either } from "effect"

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

// dot path 로 값을 안전하게 읽는다. 중간 경로가 record 가 아니면 undefined.
export const resolveField = (row: unknown, path: string): unknown => {
  const parts = path.split(".")
  let current: unknown = row
  for (const part of parts) {
    if (!isRecord(current)) return undefined
    current = current[part]
  }
  return current
}

// `--fields a,b.c` 프로젝션. 출력 키는 요청한 dot path 자체, 순서 보존, 없는 필드는 null.
export const projectFields = (
  rows: ReadonlyArray<unknown>,
  fields: ReadonlyArray<string>,
): ReadonlyArray<Record<string, unknown>> =>
  rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const field of fields) {
      const value = resolveField(row, field)
      out[field] = value === undefined ? null : value
    }
    return out
  })

const isNullish = (v: unknown): boolean => v === null || v === undefined

const compareValues = (a: unknown, b: unknown): number => {
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? 1 : -1
  return String(a).localeCompare(String(b))
}

// `--sort -field.path` (내림차순) / `field.path` (오름차순). null 은 항상 끝.
export const sortRows = (rows: ReadonlyArray<unknown>, spec: string): ReadonlyArray<unknown> => {
  const desc = spec.startsWith("-")
  const field = desc ? spec.slice(1) : spec
  const withIndex = rows.map((row, index) => ({ row, index, value: resolveField(row, field) }))

  withIndex.sort((a, b) => {
    if (isNullish(a.value) && isNullish(b.value)) return a.index - b.index
    if (isNullish(a.value)) return 1
    if (isNullish(b.value)) return -1
    const cmp = compareValues(a.value, b.value)
    if (cmp !== 0) return desc ? -cmp : cmp
    return a.index - b.index
  })

  return withIndex.map((x) => x.row)
}

export type FilterOp = "=" | "!=" | ">" | ">=" | "<" | "<=" | "~"

export interface RowPredicate {
  readonly field: string
  readonly op: FilterOp
  readonly value: string | number
}

// 긴 연산자를 먼저 시도해야 `!=`/`>=`/`<=` 가 `=`/`>`/`<` 로 잘못 쪼개지지 않는다.
const orderedOps: ReadonlyArray<FilterOp> = ["!=", ">=", "<=", "=", ">", "<", "~"]

// `--filter "field op value"`. 값은 숫자로 파싱되면 숫자, 아니면 문자열.
export const parseFilter = (expr: string): Either.Either<RowPredicate, UsageError> => {
  for (const op of orderedOps) {
    const idx = expr.indexOf(op)
    if (idx <= 0) continue
    const field = expr.slice(0, idx).trim()
    const rawValue = expr.slice(idx + op.length).trim()
    if (field.length === 0 || rawValue.length === 0) continue
    const numeric = Number(rawValue)
    const value: string | number = Number.isNaN(numeric) ? rawValue : numeric
    return Either.right({ field, op, value })
  }
  return Either.left(new UsageError({ message: `invalid filter expression: ${expr}` }))
}

const matchContains = (actual: unknown, value: string | number): boolean => {
  if (typeof actual !== "string" && typeof actual !== "number") return false
  return String(actual).toLowerCase().includes(String(value).toLowerCase())
}

const compareOp = (op: FilterOp, cmp: number): boolean => {
  switch (op) {
    case "=":
      return cmp === 0
    case "!=":
      return cmp !== 0
    case ">":
      return cmp > 0
    case ">=":
      return cmp >= 0
    case "<":
      return cmp < 0
    case "<=":
      return cmp <= 0
    default:
      return false
  }
}

const matches = (row: unknown, pred: RowPredicate): boolean => {
  const actual = resolveField(row, pred.field)
  if (pred.op === "~") return matchContains(actual, pred.value)
  if (isNullish(actual)) return false
  if (typeof actual === "number" && typeof pred.value === "number") {
    return compareOp(pred.op, actual - pred.value)
  }
  return compareOp(pred.op, String(actual).localeCompare(String(pred.value)))
}

// 여러 predicate 는 AND 로 결합한다.
export const filterRows = (
  rows: ReadonlyArray<unknown>,
  preds: ReadonlyArray<RowPredicate>,
): ReadonlyArray<unknown> => rows.filter((row) => preds.every((pred) => matches(row, pred)))

// 에이전트용 기본 요약 필드 세트.
export const summaryFields = {
  languageModel: [
    "slug",
    "name",
    "model_creator.name",
    "evaluations.artificial_analysis_intelligence_index",
    "evaluations.artificial_analysis_coding_index",
    "evaluations.artificial_analysis_agentic_index",
    "pricing.price_1m_input_tokens",
    "pricing.price_1m_output_tokens",
    "performance.median_output_tokens_per_second",
    "performance.median_time_to_first_token_seconds",
    "artificial_analysis_intelligence_index_cost.cost_per_task.total_cost",
    "artificial_analysis_intelligence_index_cost.total_cost",
  ],
  mediaModel: ["slug", "name", "model_creator.name", "elo", "ci_95", "rank", "price_per_1k_images"],
  provider: ["slug", "name"],
} as const satisfies {
  readonly languageModel: ReadonlyArray<string>
  readonly mediaModel: ReadonlyArray<string>
  readonly provider: ReadonlyArray<string>
}
