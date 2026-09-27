import { Schema } from "effect"

// 인증 실패 (401, 키 없음/무효).
export class AuthError extends Schema.TaggedError<AuthError>()("AuthError", {
  message: Schema.String,
  status: Schema.optional(Schema.Number),
  hint: Schema.optional(Schema.String),
}) {}

// 티어 부족 (403).
export class TierError extends Schema.TaggedError<TierError>()("TierError", {
  message: Schema.String,
  status: Schema.optional(Schema.Number),
  hint: Schema.optional(Schema.String),
}) {}

// 리소스 없음 (404, 잘못된 slug 등).
export class NotFound extends Schema.TaggedError<NotFound>()("NotFound", {
  message: Schema.String,
  status: Schema.optional(Schema.Number),
  hint: Schema.optional(Schema.String),
}) {}

// 일일 한도 초과 (429).
export class RateLimited extends Schema.TaggedError<RateLimited>()("RateLimited", {
  message: Schema.String,
  status: Schema.optional(Schema.Number),
  hint: Schema.optional(Schema.String),
  retryAfter: Schema.optional(Schema.Number),
  resetAt: Schema.optional(Schema.Number),
}) {}

// 잘못된 요청 (400, 필드명 오류 등).
export class BadRequest extends Schema.TaggedError<BadRequest>()("BadRequest", {
  message: Schema.String,
  status: Schema.optional(Schema.Number),
  hint: Schema.optional(Schema.String),
}) {}

// 서버 오류 (5xx).
export class ServerError extends Schema.TaggedError<ServerError>()("ServerError", {
  message: Schema.String,
  status: Schema.optional(Schema.Number),
  hint: Schema.optional(Schema.String),
}) {}

// 네트워크 계층 실패 (연결 불가, 타임아웃 등).
export class NetworkError extends Schema.TaggedError<NetworkError>()("NetworkError", {
  message: Schema.String,
  hint: Schema.optional(Schema.String),
}) {}

// 응답 본문이 기대한 Schema 로 디코드되지 않음.
export class DecodeError extends Schema.TaggedError<DecodeError>()("DecodeError", {
  message: Schema.String,
  hint: Schema.optional(Schema.String),
}) {}

// CLI 사용법 오류 (인자 조합 오류 등, HTTP 왕복 이전에 발생).
export class UsageError extends Schema.TaggedError<UsageError>()("UsageError", {
  message: Schema.String,
  hint: Schema.optional(Schema.String),
}) {}

export type AaError =
  | AuthError
  | TierError
  | NotFound
  | RateLimited
  | BadRequest
  | ServerError
  | NetworkError
  | DecodeError
  | UsageError

// README 종료 코드 표 구현.
export const exitCodeOf = (e: AaError): number => {
  if (e instanceof UsageError || e instanceof BadRequest) return 2
  if (e instanceof AuthError) return 3
  if (e instanceof TierError) return 4
  if (e instanceof NotFound) return 5
  if (e instanceof RateLimited) return 6
  return 1 // NetworkError | DecodeError | ServerError
}

// CLI JSON 에러 출력의 `error.code` 필드.
export const errorCodeOf = (e: AaError): string => {
  if (e instanceof AuthError) return "auth"
  if (e instanceof TierError) return "tier"
  if (e instanceof NotFound) return "not_found"
  if (e instanceof RateLimited) return "rate_limited"
  if (e instanceof BadRequest) return "bad_request"
  if (e instanceof NetworkError) return "network"
  if (e instanceof DecodeError) return "decode"
  if (e instanceof UsageError) return "usage"
  return "server" // ServerError
}
