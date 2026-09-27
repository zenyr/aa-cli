import { Schema } from "effect"
import { Tier } from "./tier.ts"

// X-RateLimit-* 응답 헤더.
export class RateLimit extends Schema.Class<RateLimit>("RateLimit")({
  limit: Schema.Number,
  remaining: Schema.Number,
  reset: Schema.Number,
}) {}

// 어댑터가 HTTP 응답을 감싸 유스케이스로 넘길 때 붙이는 메타데이터.
export class ResponseMeta extends Schema.Class<ResponseMeta>("ResponseMeta")({
  tier: Schema.NullOr(Tier),
  rate_limit: Schema.NullOr(RateLimit),
  source: Schema.String,
  cached: Schema.Boolean,
  fetched_at: Schema.String,
}) {}
