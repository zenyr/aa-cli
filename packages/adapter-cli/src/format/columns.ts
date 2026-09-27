// table/tsv/md 공통: 컬럼 목록 산출 + 셀 렌더링.
import type { Row } from "./types.ts"

// 행들을 순회하며 처음 등장한 순서로 키를 모은다.
export const collectColumns = (rows: ReadonlyArray<Row>): ReadonlyArray<string> => {
  const seen = new Set<string>()
  const columns: Array<string> = []
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue
      seen.add(key)
      columns.push(key)
    }
  }
  return columns
}

// null/undefined 를 대시로 렌더링 (table/md 전용).
export const renderCellDash = (value: unknown): string => {
  if (value === null || value === undefined) return "-"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return JSON.stringify(value)
}

// null/undefined 를 빈 문자열로 렌더링 (tsv 전용).
export const renderCellBlank = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return JSON.stringify(value)
}
