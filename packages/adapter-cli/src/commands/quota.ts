// `aa-cli quota`: 캐시된 사용량 한도 상태 (API 요청을 소모하지 않는다).
import { getQuotaView, toResult } from "@aa/application"
import { RateLimit, ResponseMeta } from "@aa/domain"
import { Command } from "@effect/cli"
import { Effect } from "effect"
import { dataOptions } from "../global-options.ts"
import { runItemCommand } from "./support.ts"

const summaryFields = [
  "tier",
  "limit",
  "remaining",
  "reset",
  "reset_in_seconds",
  "observed_at",
  "stale",
]

export const quotaCommand = Command.make("quota", { ...dataOptions }, (opts) => {
  const effect = Effect.map(getQuotaView(), (view) => {
    const meta = new ResponseMeta({
      tier: view.tier,
      rate_limit:
        view.limit !== null && view.remaining !== null && view.reset !== null
          ? new RateLimit({ limit: view.limit, remaining: view.remaining, reset: view.reset })
          : null,
      source: "cache",
      cached: true,
      fetched_at: view.observed_at ?? new Date(0).toISOString(),
    })
    const notices: Array<string> = []
    if (view.observed_at === null) notices.push("no quota observed yet; run any data command first")
    if (view.stale) notices.push("window rolled over since last observation; full quota assumed")
    return toResult(view, meta, notices)
  })
  return runItemCommand(opts, summaryFields, effect)
}).pipe(
  Command.withDescription(
    "캐시된 사용량 한도 상태 (요청 소모 없음). 기억된 티어를 즉시 잊게 하려면 aa-cli cache clear --quota",
  ),
)
