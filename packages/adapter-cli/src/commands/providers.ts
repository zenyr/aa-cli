// `aa providers [<slug>] [perf|measurements]`: provider 목록 / 단건 / 성능 / 측정치 (commercial).
import {
  getProvider,
  getProviderMeasurements,
  getProviderPerformance,
  listProviders,
  summaryFields,
} from "@aa/application"
import type {
  GetProviderOpts,
  ListProvidersOpts,
  ProviderMeasurementsOpts,
  ProviderPerfOpts,
} from "@aa/application"
import { PerfInterval, PerfWindow, UsageError } from "@aa/domain"
import { Args, Command, Options } from "@effect/cli"
import { Effect, Option } from "effect"
import { dataOptions } from "../global-options.ts"
import { commonOptsOf, runItemCommand, runListCommand } from "./support.ts"

const slug = Args.text({ name: "slug" }).pipe(Args.optional)

// `perf` 또는 `measurements` 리터럴만 허용하는 선택적 트레일링 토큰.
const mode = Args.text({ name: "mode" }).pipe(
  Args.optional,
  Args.withDescription("생략하면 단건 조회, 'perf'/'measurements' 는 slug 필요 (commercial)"),
)

const allPages = Options.boolean("all-pages").pipe(
  Options.withDefault(false),
  Options.withDescription("페이지네이션된 결과를 모두 모아서 반환"),
)

const window = Options.choice("window", PerfWindow.literals).pipe(
  Options.optional,
  Options.withDescription("perf 조회 기간"),
)

const interval = Options.choice("interval", PerfInterval.literals).pipe(
  Options.optional,
  Options.withDescription("perf 집계 간격"),
)

const startDate = Options.text("start-date").pipe(
  Options.optional,
  Options.withDescription("measurements 시작일 (YYYY-MM-DD)"),
)

const providerSummaryFields: ReadonlyArray<string> = summaryFields.provider

export const providersCommand = Command.make(
  "providers",
  { ...dataOptions, slug, mode, allPages, window, interval, startDate },
  (opts) => {
    if (Option.isNone(opts.slug)) {
      if (Option.isSome(opts.mode)) {
        const err = new UsageError({
          message: "'perf'/'measurements' requires <slug>",
          hint: "aa providers <slug> perf|measurements",
        })
        return runListCommand(opts, providerSummaryFields, Effect.fail(err))
      }
      const listOpts: ListProvidersOpts = { ...commonOptsOf(opts), allPages: opts.allPages }
      return runListCommand(opts, providerSummaryFields, listProviders(listOpts))
    }

    const providerSlug = opts.slug.value

    if (Option.isNone(opts.mode)) {
      const getOpts: GetProviderOpts = {
        ...commonOptsOf(opts),
        ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
      }
      return runItemCommand(opts, providerSummaryFields, getProvider(providerSlug, getOpts))
    }

    if (opts.mode.value === "perf") {
      const perfOpts: ProviderPerfOpts = {
        ...commonOptsOf(opts),
        ...(Option.isSome(opts.window) ? { window: opts.window.value } : {}),
        ...(Option.isSome(opts.interval) ? { interval: opts.interval.value } : {}),
        ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
      }
      return runItemCommand(opts, [], getProviderPerformance(providerSlug, perfOpts))
    }

    if (opts.mode.value === "measurements") {
      const measurementsOpts: ProviderMeasurementsOpts = {
        ...commonOptsOf(opts),
        ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
        ...(Option.isSome(opts.startDate) ? { startDate: opts.startDate.value } : {}),
      }
      return runItemCommand(opts, [], getProviderMeasurements(providerSlug, measurementsOpts))
    }

    const err = new UsageError({
      message: `invalid trailing argument: ${opts.mode.value}`,
      hint: "the only supported trailing arguments are 'perf' and 'measurements'",
    })
    return runItemCommand(opts, providerSummaryFields, Effect.fail(err))
  },
).pipe(Command.withDescription("provider 목록 / 단건 / 성능 / 측정치"))
