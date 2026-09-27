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

// application 의 row 헬퍼들은 구조를 모르는 `unknown` 값을 다룬다. 최종적으로 렌더링 가능한
// 레코드 배열(Row[])을 내놓기 위한 경계에서만 단일 타입 단언을 쓴다 (`as unknown` 은 아니다).
const asRows = (rows: ReadonlyArray<unknown>): ReadonlyArray<Row> => rows as ReadonlyArray<Row>

// filter/sort/projection/limit 순서로 적용한다. filter 표현식 하나라도 잘못되면 UsageError 로 실패한다.
export const applyRowPipeline = (
  rows: ReadonlyArray<unknown>,
  opts: RowPipelineOptions,
): Effect.Effect<ReadonlyArray<Row>, UsageError> =>
  Effect.gen(function* () {
    const predicates = []
    for (const expr of opts.filters) {
      const parsed = parseFilter(expr)
      if (parsed._tag === "Left") return yield* Effect.fail(parsed.left)
      predicates.push(parsed.right)
    }
    const filtered = filterRows(rows, predicates)
    const sorted = opts.sort === undefined ? filtered : sortRows(filtered, opts.sort)
    const limited = opts.limit === undefined ? sorted : sorted.slice(0, opts.limit)
    const fieldList =
      opts.fields !== undefined
        ? opts.fields.split(",").map((f) => f.trim())
        : opts.full
          ? undefined
          : opts.summaryFields
    return fieldList === undefined ? asRows(limited) : projectFields(limited, fieldList)
  })
