// `aa-cli perf <query>`: 언어 모델 성능 추이 (commercial 티어).
import { getModelPerformance } from "@aa/application"
import type { PerfWindowOpts } from "@aa/application"
import { PerfInterval, PerfWindow } from "@aa/domain"
import { Args, Command, Options } from "@effect/cli"
import { Option } from "effect"
import { fetchOptions, outputOptions, promptTypeOption } from "../global-options.ts"
import { commonOptsOf, runItemCommand } from "./support.ts"

const query = Args.text({ name: "query" }).pipe(
  Args.withDescription('slug or name query, e.g. aa-cli perf "opus 5.5"'),
)

const window = Options.choice("window", PerfWindow.literals).pipe(
  Options.optional,
  Options.withDescription("perf query window"),
)

const interval = Options.choice("interval", PerfInterval.literals).pipe(
  Options.optional,
  Options.withDescription("perf aggregation interval"),
)

export const perfCommand = Command.make(
  "perf",
  { ...outputOptions, ...fetchOptions, ...promptTypeOption, query, window, interval },
  (opts) => {
    const perfOpts: PerfWindowOpts = {
      ...commonOptsOf(opts),
      ...(Option.isSome(opts.window) ? { window: opts.window.value } : {}),
      ...(Option.isSome(opts.interval) ? { interval: opts.interval.value } : {}),
      ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
    }
    return runItemCommand(opts, [], getModelPerformance(opts.query, perfOpts))
  },
).pipe(Command.withDescription("Language model performance history over time (commercial)"))
