// `aa-cli cache clear [--quota]`: 로컬 캐시를 비우는 수동 탈출구.
import { clearCache, toResult } from "@aa/application"
import { ResponseMeta } from "@aa/domain"
import { Command, Options } from "@effect/cli"
import { Effect, Option, Ref } from "effect"
import { ExitCode } from "../exit-code.ts"
import { formatOnlyOptions } from "../global-options.ts"
import { Output } from "../output.ts"
import { runItemCommand } from "./support.ts"

const summaryFields = ["cleared"]

const quota = Options.boolean("quota").pipe(
  Options.withDefault(false),
  Options.withDescription("Forget the remembered tier/quota only (re-detects on next request)"),
)

const clearCommand = Command.make("clear", { ...formatOnlyOptions, quota }, (opts) => {
  const meta = new ResponseMeta({
    tier: null,
    rate_limit: null,
    source: "cache",
    cached: false,
    fetched_at: new Date().toISOString(),
  })
  const effect = Effect.map(clearCache({ quotaOnly: opts.quota }), (result) =>
    toResult(result, meta),
  )
  return runItemCommand({ ...opts, fields: Option.none() }, summaryFields, effect)
}).pipe(Command.withDescription("Clear local cache (default: responses+tier, --quota: tier only)"))

const cacheBase = Command.make("cache", {}, () =>
  Effect.gen(function* () {
    const output = yield* Output
    yield* output.stderr("aa-cli cache: usage: a subcommand is required (see --help)")
    const exit = yield* ExitCode
    yield* Ref.set(exit, 2)
  }),
).pipe(Command.withDescription("Manage the local cache"))

export const cacheCommand = cacheBase.pipe(Command.withSubcommands([clearCommand]))
