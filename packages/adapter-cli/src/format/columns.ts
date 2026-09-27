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

// table/md 헤더 전용: dot-path 를 마지막 세그먼트로 줄이되, 충돌하는 컬럼끼리만 최소 접미 세그먼트 수로 늘려 구분한다.
export const shortenHeaders = (columns: ReadonlyArray<string>): ReadonlyArray<string> => {
  const segments = columns.map((col) => col.split("."))
  const suffixLengths = segments.map(() => 1)
  const headerAt = (i: number): string =>
    (segments[i] ?? []).slice(-(suffixLengths[i] ?? 1)).join(".")
  for (;;) {
    const headers = columns.map((_, i) => headerAt(i))
    const counts = new Map<string, number>()
    for (const h of headers) counts.set(h, (counts.get(h) ?? 0) + 1)
    const duplicateIndexes = headers
      .map((h, i) => ((counts.get(h) ?? 0) > 1 ? i : -1))
      .filter((i) => i >= 0)
    if (duplicateIndexes.length === 0) return headers
    let grew = false
    for (const i of duplicateIndexes) {
      const segs = segments[i] ?? []
      const len = suffixLengths[i] ?? 1
      if (len < segs.length) {
        suffixLengths[i] = len + 1
        grew = true
      }
    }
    if (!grew) return headers
  }
}
