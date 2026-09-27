import { Cache } from "@aa/domain"
import type { QuotaSnapshot } from "@aa/domain"
import { Effect, Option } from "effect"

// 캐시된 마지막 사용량 한도 상태. API 호출을 소모하지 않는다.
export const getQuota = (): Effect.Effect<Option.Option<QuotaSnapshot>, never, Cache> =>
  Effect.gen(function* () {
    const cache = yield* Cache
    return yield* cache.getRateLimit()
  })
