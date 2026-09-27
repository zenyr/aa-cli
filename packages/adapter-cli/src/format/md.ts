// Markdown 표 포매터.
import { collectColumns, renderCellDash } from "./columns.ts"
import type { Row } from "./types.ts"

const escapePipe = (value: string): string => value.replaceAll("|", "\\|")

export const formatMd = (rows: ReadonlyArray<Row>): string => {
  const columns = collectColumns(rows)
  if (columns.length === 0) return ""
  const header = `| ${columns.join(" | ")} |`
  const separator = `| ${columns.map(() => "---").join(" | ")} |`
  const body = rows.map(
    (row) => `| ${columns.map((col) => escapePipe(renderCellDash(row[col]))).join(" | ")} |`,
  )
  return [header, separator, ...body].join("\n")
}
