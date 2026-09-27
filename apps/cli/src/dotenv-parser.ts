// 순수 파서: 단순 `KEY=VALUE` 형식의 dotenv 파일 내용을 Map 으로 변환한다.
const stripQuotes = (value: string): string => {
  const trimmed = value.trim()
  const isDoubleQuoted = trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2
  const isSingleQuoted = trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2
  if (isDoubleQuoted || isSingleQuoted) return trimmed.slice(1, -1)
  return trimmed
}

const parseLine = (line: string): readonly [string, string] | undefined => {
  const withoutExport = line.trim().startsWith("export ")
    ? line.trim().slice("export ".length)
    : line.trim()
  if (withoutExport === "" || withoutExport.startsWith("#")) return undefined

  const separatorIndex = withoutExport.indexOf("=")
  if (separatorIndex === -1) return undefined

  const key = withoutExport.slice(0, separatorIndex).trim()
  if (key === "") return undefined

  const value = stripQuotes(withoutExport.slice(separatorIndex + 1))
  return [key, value]
}

// dotenv 형식 텍스트를 KEY -> VALUE Map 으로 파싱한다. 빈 줄과 `#` 주석은 건너뛴다.
export const parseDotenv = (content: string): Map<string, string> => {
  const entries = content
    .split(/\r?\n/)
    .map(parseLine)
    .filter((entry): entry is readonly [string, string] => entry !== undefined)
  return new Map(entries)
}
