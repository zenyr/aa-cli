// `aa raw <path> [--query k=v ...]`: 탈출구 - 임의 GET, 응답 스키마를 강제하지 않는다.
import { rawGet } from "@aa/application"
import { UsageError } from "@aa/domain"
import { Args, Command, Options } from "@effect/cli"
import { Effect } from "effect"
import { dataOptions } from "../global-options.ts"
import { commonOptsOf, runRawCommand } from "./support.ts"

const path = Args.text({ name: "path" }).pipe(Args.withDescription("`/api/v2` 기준 상대 경로"))

const query = Options.text("query").pipe(
  Options.repeated,
  Options.withDescription("쿼리 파라미터 `k=v` (반복 가능)"),
)

// `k=v` 문자열 배열을 Record 로 파싱. `=` 가 없으면 UsageError.
const parseQuery = (
  pairs: ReadonlyArray<string>,
): Effect.Effect<Record<string, string>, UsageError> => {
  const result: Record<string, string> = {}
  for (const pair of pairs) {
    const idx = pair.indexOf("=")
    if (idx <= 0) {
      return Effect.fail(
        new UsageError({
          message: `invalid --query value: ${pair}`,
          hint: "expected k=v",
        }),
      )
    }
    result[pair.slice(0, idx)] = pair.slice(idx + 1)
  }
  return Effect.succeed(result)
}

export const rawCommand = Command.make("raw", { ...dataOptions, path, query }, (opts) => {
  const effect = parseQuery(opts.query).pipe(
    Effect.flatMap((parsedQuery) => rawGet(opts.path, parsedQuery, commonOptsOf(opts))),
  )
  return runRawCommand(opts, effect)
}).pipe(Command.withDescription("탈출구: 임의 GET"))
