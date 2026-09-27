// `aa endpoints`: 지원 엔드포인트와 필요 티어 (정적 카탈로그, 요청을 소모하지 않는다).
import { endpoints, toResult } from "@aa/application"
import { ResponseMeta } from "@aa/domain"
import { Command } from "@effect/cli"
import { Effect } from "effect"
import { dataOptions } from "../global-options.ts"
import { runListCommand } from "./support.ts"

const summaryFields: ReadonlyArray<string> = ["method", "path", "tier", "command", "summary"]

export const endpointsCommand = Command.make("endpoints", { ...dataOptions }, (opts) => {
  const meta = new ResponseMeta({
    tier: null,
    rate_limit: null,
    source: "static",
    cached: true,
    fetched_at: new Date().toISOString(),
  })
  const effect = Effect.succeed(toResult(endpoints, meta))
  return runListCommand(opts, summaryFields, effect)
}).pipe(Command.withDescription("지원 엔드포인트와 필요 티어"))
