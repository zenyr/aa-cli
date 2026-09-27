// `aa quota`: 캐시된 사용량 한도 상태 (API 요청을 소모하지 않는다).
import { getQuota, toResult } from "@aa/application"
import { ResponseMeta } from "@aa/domain"
import { Command } from "@effect/cli"
import { Effect, Option } from "effect"
import { dataOptions } from "../global-options.ts"
import { runItemCommand } from "./support.ts"

export const quotaCommand = Command.make("quota", { ...dataOptions }, (opts) => {
  const effect = Effect.map(getQuota(), (snapshot) => {
    if (Option.isNone(snapshot)) {
      const meta = new ResponseMeta({
        tier: null,
        rate_limit: null,
        source: "cache",
        cached: true,
        fetched_at: new Date(0).toISOString(),
      })
      return toResult(null, meta, ["no quota observed yet; run any data command first"])
    }
    const s = snapshot.value
    const meta = new ResponseMeta({
      tier: s.tier,
      rate_limit: s.rateLimit,
      source: "cache",
      cached: true,
      fetched_at: new Date(s.observedAt).toISOString(),
    })
    return toResult(
      { tier: s.tier, rate_limit: s.rateLimit, observed_at: new Date(s.observedAt).toISOString() },
      meta,
    )
  })
  return runItemCommand(opts, ["tier", "rate_limit", "observed_at"], effect)
}).pipe(Command.withDescription("캐시된 사용량 한도 상태 (요청 소모 없음)"))
