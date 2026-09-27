// `aa-cli model <query> [perf]`: 언어 모델 단건 조회 / 성능 추이 (perf 는 commercial 티어).
import { getLanguageModel, getModelPerformance, summaryFields } from "@aa/application"
import type { GetLanguageModelOpts, PerfWindowOpts } from "@aa/application"
import { PerfInterval, PerfWindow, UsageError } from "@aa/domain"
import { Args, Command, Options } from "@effect/cli"
import { Effect, Option } from "effect"
import { dataOptions } from "../global-options.ts"
import { commonOptsOf, runItemCommand } from "./support.ts"

// slug 또는 이름/키워드 질의. 트레일링 `perf` 모드와 구분해야 하므로 공백 포함 질의는 따옴표로 감싼다.
const slug = Args.text({ name: "query" }).pipe(
  Args.withDescription('slug 또는 이름 질의, 예: aa-cli model "opus 5.5"'),
)

// `perf` 리터럴만 허용하는 선택적 트레일링 토큰.
const mode = Args.text({ name: "mode" }).pipe(
  Args.optional,
  Args.withDescription("생략하면 단건 조회, 'perf' 를 주면 성능 추이 (commercial)"),
)

const window = Options.choice("window", PerfWindow.literals).pipe(
  Options.optional,
  Options.withDescription("perf 조회 기간"),
)

const interval = Options.choice("interval", PerfInterval.literals).pipe(
  Options.optional,
  Options.withDescription("perf 집계 간격"),
)

export const modelCommand = Command.make(
  "model",
  { ...dataOptions, slug, mode, window, interval },
  (opts) => {
    if (Option.isSome(opts.mode) && opts.mode.value !== "perf") {
      const err = new UsageError({
        message: `invalid trailing argument: ${opts.mode.value}`,
        hint: "the only supported trailing argument is 'perf'",
      })
      return runItemCommand(opts, [], Effect.fail(err))
    }

    if (Option.isSome(opts.mode)) {
      const perfOpts: PerfWindowOpts = {
        ...commonOptsOf(opts),
        ...(Option.isSome(opts.window) ? { window: opts.window.value } : {}),
        ...(Option.isSome(opts.interval) ? { interval: opts.interval.value } : {}),
        ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
      }
      return runItemCommand(opts, [], getModelPerformance(opts.slug, perfOpts))
    }

    const getOpts: GetLanguageModelOpts = {
      ...commonOptsOf(opts),
      ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
    }
    return runItemCommand(opts, summaryFields.languageModel, getLanguageModel(opts.slug, getOpts))
  },
).pipe(
  Command.withDescription(
    [
      '언어 모델 단건 조회 / 성능 추이. 질의에 공백이 있으면 따옴표로 감싼다: aa-cli model "opus 5.5"',
    ].join("\n"),
  ),
)
