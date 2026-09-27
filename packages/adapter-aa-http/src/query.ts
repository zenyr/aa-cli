// 쿼리 파라미터를 URL 문자열 레코드로 정규화한다: undefined 제거, boolean/number 는 문자열화.
export const toUrlParams = (
  query: Record<string, string | number | boolean | undefined> | undefined,
): Record<string, string> => {
  if (query === undefined) return {}
  const entries = Object.entries(query).filter(
    (entry): entry is [string, string | number | boolean] => entry[1] !== undefined,
  )
  return Object.fromEntries(entries.map(([key, value]) => [key, String(value)]))
}
