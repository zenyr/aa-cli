// 포맷 선택 + 최종 stdout 문자열 조립.
import { formatJson, formatJsonl } from "./json.ts"
import { formatMd } from "./md.ts"
import { formatTable } from "./table.ts"
import { formatTsv } from "./tsv.ts"
import { attribution, type Format, type OutputMeta, type Row } from "./types.ts"

export * from "./types.ts"

export interface FormattedOutput {
  readonly stdout: string
  readonly stderr: ReadonlyArray<string>
}

// data 가 배열이면 row 로 쓰고, 아니면 단일 레코드를 한 행으로 감싼다.
export const asRows = (data: unknown): ReadonlyArray<Row> => {
  if (Array.isArray(data)) return data as ReadonlyArray<Row>
  if (data !== null && typeof data === "object") return [data as Row]
  return [{ value: data }]
}

// format 에 따라 stdout 본문과 (table 한정) stderr 안내 줄을 만든다.
export const formatOutput = (format: Format, data: unknown, meta: OutputMeta): FormattedOutput => {
  const rows = asRows(data)
  switch (format) {
    case "json":
      return { stdout: formatJson(data, meta), stderr: [] }
    case "jsonl":
      return { stdout: formatJsonl(rows), stderr: [] }
    case "tsv":
      return { stdout: formatTsv(rows), stderr: [] }
    case "md":
      return { stdout: formatMd(rows), stderr: [] }
    case "table":
      return { stdout: formatTable(rows), stderr: tableStderr(meta) }
  }
}

const tableStderr = (meta: OutputMeta): ReadonlyArray<string> => [attribution, ...meta.notices]
