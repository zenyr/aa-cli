// 목록 데이터에 대한 필드 프로젝션/정렬/필터/limit 적용. application 의 순수 헬퍼를 그대로 감싼다.
import { filterRows, parseFilter, projectFields, sortRows } from "@aa/application"
import type { UsageError } from "@aa/domain"
import { Effect } from "effect"
import type { Row } from "./format/index.ts"

export interface RowPipelineOptions {
  readonly fields: string | undefined
  readonly summaryFields: ReadonlyArray<string>
  readonly full: boolean
  readonly sort: string | undefined
  readonly filters: ReadonlyArray<string>
  readonly limit: number | undefined
}

const asRowArray = (rows: ReadonlyArray<unknown>): ReadonlyArray<Row> => rows as ReadonlyArray<Row>

// filter/sort/projection/limit 순서로 적용한다. filter 표현식 하나라도 잘못되면 UsageError 로 실패한다.
export const applyRowPipeline = (
  rows: ReadonlyArray<Row>,
  opts: RowPipelineOptions,
): Effect.Effect<ReadonlyArray<Row>, UsageError> =>
  Effect.gen(function* () {
    const predicates = []
    for (const expr of opts.filters) {
      const parsed = parseFilter(expr)
      if (parsed._tag === "Left") return yield* Effect.fail(parsed.left)
      predicates.push(parsed.right)
    }
    const filtered = asRowArray(filterRows(rows, predicates))
    const sorted = opts.sort === undefined ? filtered : asRowArray(sortRows(filtered, opts.sort))
    const limited = opts.limit === undefined ? sorted : sorted.slice(0, opts.limit)
    const fieldList =
      opts.fields !== undefined
        ? opts.fields.split(",").map((f) => f.trim())
        : opts.full
          ? undefined
          : opts.summaryFields
    return fieldList === undefined ? limited : projectFields(limited, fieldList)
  })
