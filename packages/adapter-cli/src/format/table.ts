// 표 포매터 (사람이 읽는 정렬된 열).
import { collectColumns, renderCellDash } from "./columns.ts"
import type { Row } from "./types.ts"

export const formatTable = (rows: ReadonlyArray<Row>): string => {
  const columns = collectColumns(rows)
  if (columns.length === 0) return ""
  const cells = rows.map((row) => columns.map((col) => renderCellDash(row[col])))
  const widths = columns.map((col, i) =>
    Math.max(col.length, ...cells.map((line) => line[i]?.length ?? 0)),
  )
  const renderLine = (cellsInLine: ReadonlyArray<string>): string =>
    cellsInLine
      .map((cell, i) => cell.padEnd(widths[i] ?? 0))
      .join("  ")
      .trimEnd()
  const header = renderLine(columns)
  const separator = widths.map((w) => "-".repeat(w)).join("  ")
  const body = cells.map((line) => renderLine(line))
  return [header, separator, ...body].join("\n")
}
