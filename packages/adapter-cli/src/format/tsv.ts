// TSV 포매터.
import { collectColumns, renderCellBlank } from "./columns.ts"
import type { Row } from "./types.ts"

export const formatTsv = (rows: ReadonlyArray<Row>): string => {
  const columns = collectColumns(rows)
  if (columns.length === 0) return ""
  const header = columns.join("\t")
  const body = rows.map((row) => columns.map((col) => renderCellBlank(row[col])).join("\t"))
  return [header, ...body].join("\n")
}
