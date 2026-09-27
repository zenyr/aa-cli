import { Context, Effect, Option, Schema } from "effect"
import type { AaError } from "./errors.ts"
import type { RateLimit, ResponseMeta } from "./response-meta.ts"
import type { Tier } from "./tier.ts"

// GET 요청 하나. path 는 `/api/v2` 기준 상대 경로 (예: "/language/models").
export interface AaApiRequest<A, I> {
  readonly path: string
  readonly query?: Record<string, string | number | boolean | undefined>
  readonly schema: Schema.Schema<A, I>
}

// 드라이븐 포트: AA HTTP API. 어댑터가 fetch + 헤더 파싱 + 상태 코드 매핑 + Schema 디코드를 구현한다.
export class AaApi extends Context.Tag("@aa/domain/AaApi")<
  AaApi,
  {
    readonly get: <A, I>(
      req: AaApiRequest<A, I>,
    ) => Effect.Effect<{ readonly body: A; readonly meta: ResponseMeta }, AaError>
  }
>() {}

// 캐시에 저장된 값 하나. value 는 캐시 어댑터 입장에서 구조를 모르는 채로 다룬다.
export interface CacheEntry {
  readonly value: unknown
  readonly storedAt: number
}

// 마지막으로 관측된 사용량 한도 상태 (`aa quota` 용). API 호출을 새로 소모하지 않는다.
export interface QuotaSnapshot {
  readonly tier: Tier
  readonly rateLimit: RateLimit
  readonly observedAt: number
}

// 드라이븐 포트: 파일 캐시. 캐시 실패가 본 요청을 실패시키면 안 되므로 에러 채널은 `never`.
export class Cache extends Context.Tag("@aa/domain/Cache")<
  Cache,
  {
    readonly get: (key: string) => Effect.Effect<Option.Option<CacheEntry>, never>
    readonly set: (key: string, value: unknown, ttlSeconds: number) => Effect.Effect<void, never>
    readonly clear: () => Effect.Effect<void, never>
    readonly getRateLimit: () => Effect.Effect<Option.Option<QuotaSnapshot>, never>
    readonly setRateLimit: (snapshot: QuotaSnapshot) => Effect.Effect<void, never>
    readonly clearRateLimit: () => Effect.Effect<void, never>
  }
>() {}
