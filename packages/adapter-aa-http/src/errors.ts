import type { HttpClientError } from "@effect/platform"
import {
  AuthError,
  BadRequest,
  DecodeError,
  NetworkError,
  NotFound,
  RateLimited,
  ServerError,
  TierError,
} from "@aa/domain"
import type { AaError } from "@aa/domain"
import { TreeFormatter } from "effect/ParseResult"
import type { ParseError } from "effect/ParseResult"

// AA 에러 바디: `{ error, details? }`. 모르는 형태면 undefined.
export const readErrorBody = (raw: unknown): { readonly message?: string } => {
  if (typeof raw !== "object" || raw === null) return {}
  const record = raw as Record<string, unknown>
  return typeof record["error"] === "string" ? { message: record["error"] } : {}
}

// HttpClient 전송 실패 (연결 불가, 타임아웃 등) 를 NetworkError 로 변환한다.
export const toNetworkError = (error: HttpClientError.HttpClientError): NetworkError =>
  new NetworkError({ message: error.message })

// 상태 코드 + 파싱된 에러 바디를 도메인 AaError 로 매핑한다. 2xx 는 호출하지 않는다.
export const toStatusError = (status: number, body: { readonly message?: string }): AaError => {
  const message = body.message ?? `AA API request failed with status ${status}`
  if (status === 400) return new BadRequest({ message, status })
  if (status === 401)
    return new AuthError({ message, status, hint: "set AA_APIKEY (see .env.example)" })
  if (status === 403) return new TierError({ message, status, hint: "try --free or a higher tier" })
  if (status === 404) return new NotFound({ message, status })
  return new ServerError({ message, status })
}

// 429 전용 매핑: Retry-After, X-RateLimit-Reset 을 붙인다.
export const toRateLimited = (
  body: { readonly message?: string },
  retryAfter: number | undefined,
  resetAt: number | undefined,
): RateLimited =>
  new RateLimited({
    message: body.message ?? "AA API rate limit exceeded",
    status: 429,
    ...(retryAfter !== undefined ? { retryAfter } : {}),
    ...(resetAt !== undefined ? { resetAt } : {}),
  })

// Schema 디코드 실패를 DecodeError 로 요약한다.
export const toDecodeError = (error: ParseError): DecodeError =>
  new DecodeError({ message: TreeFormatter.formatErrorSync(error) })
