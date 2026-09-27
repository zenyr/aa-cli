import { Cache } from "@aa/domain"
import type { QuotaSnapshot, Tier } from "@aa/domain"
import { Clock, Effect, Option } from "effect"

// 캐시된 마지막 사용량 한도 상태. API 호출을 소모하지 않는다.
export const getQuota = (): Effect.Effect<Option.Option<QuotaSnapshot>, never, Cache> =>
  Effect.gen(function* () {
    const cache = yield* Cache
    return yield* cache.getRateLimit()
  })

// CLI `aa quota` 가 그대로 출력할 수 있는, 롤오버를 반영한 사용량 뷰.
export interface QuotaView {
  readonly tier: Tier | null
  readonly limit: number | null
  readonly remaining: number | null
  readonly reset: number | null
  readonly reset_in_seconds: number | null
  readonly observed_at: string | null
  readonly stale: boolean
}

const emptyQuotaView: QuotaView = {
  tier: null,
  limit: null,
  remaining: null,
  reset: null,
  reset_in_seconds: null,
  observed_at: null,
  stale: false,
}

// 스냅샷 시점 이후 리셋 윈도우가 지났으면 remaining 을 limit 으로 되돌리고 stale 로 표시한다.
export const getQuotaView = (): Effect.Effect<QuotaView, never, Cache> =>
  Effect.gen(function* () {
    const cache = yield* Cache
    const snapshot = yield* cache.getRateLimit()
    if (Option.isNone(snapshot)) return emptyQuotaView

    const { tier, rateLimit, observedAt } = snapshot.value
    const now = yield* Clock.currentTimeMillis
    const resetMs = rateLimit.reset * 1000
    const rolledOver = now >= resetMs

    return {
      tier,
      limit: rateLimit.limit,
      remaining: rolledOver ? rateLimit.limit : rateLimit.remaining,
      reset: rateLimit.reset,
      reset_in_seconds: rolledOver ? null : Math.max(0, Math.ceil((resetMs - now) / 1000)),
      observed_at: new Date(observedAt).toISOString(),
      stale: rolledOver,
    }
  })
