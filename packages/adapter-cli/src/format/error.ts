// 에러를 stderr 렌더링 문자열로 바꾼다 (json / human 두 갈래).
import { errorCodeOf, RateLimited, type AaError } from "@aa/domain"
import type { Format } from "./types.ts"

export interface RenderedError {
  readonly lines: ReadonlyArray<string>
  readonly exitCode: number
}

const statusOf = (e: AaError): number | undefined =>
  "status" in e && typeof e.status === "number" ? e.status : undefined

const hintOf = (e: AaError): string | undefined =>
  "hint" in e && typeof e.hint === "string" ? e.hint : undefined

// unix seconds -> ISO string.
const isoOf = (unixSeconds: number): string => new Date(unixSeconds * 1000).toISOString()

export const formatErrorJson = (e: AaError): string =>
  JSON.stringify({
    error: {
      code: errorCodeOf(e),
      message: e.message,
      hint: hintOf(e) ?? null,
      status: statusOf(e) ?? null,
      ...(e instanceof RateLimited && e.retryAfter !== undefined
        ? { retry_after: e.retryAfter }
        : {}),
      ...(e instanceof RateLimited && e.resetAt !== undefined
        ? { reset_at: isoOf(e.resetAt) }
        : {}),
    },
  })

export const formatErrorHuman = (e: AaError): ReadonlyArray<string> => {
  const lines = [`aa-cli: ${errorCodeOf(e)}: ${e.message}`]
  const hint = hintOf(e)
  if (hint !== undefined) lines.push(`hint: ${hint}`)
  if (e instanceof RateLimited && e.retryAfter !== undefined) {
    const resetSuffix = e.resetAt !== undefined ? ` (resets ${isoOf(e.resetAt)})` : ""
    lines.push(`retry after: ${e.retryAfter}s${resetSuffix}`)
  }
  return lines
}

export const formatError = (format: Format, e: AaError): ReadonlyArray<string> =>
  format === "json" ? [formatErrorJson(e)] : formatErrorHuman(e)
