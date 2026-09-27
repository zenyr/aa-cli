// `aa-cli providers list|show|perf|measurements`: API provider 목록/단건/성능/측정치 (commercial).
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
import { PerfInterval, PerfWindow } from "@aa/domain"
import { Args, Command, Options } from "@effect/cli"
import { Effect, Option, Ref } from "effect"
import { fetchOptions, outputOptions, promptTypeOption } from "../global-options.ts"
import { ExitCode } from "../exit-code.ts"
import { groupHelpSpecs } from "../help-spec.ts"
import { renderGroupHelp } from "../help.ts"
import { Output } from "../output.ts"
import { commonOptsOf, runItemCommand, runListCommand } from "./support.ts"

const providersGroupSpec = groupHelpSpecs.find((s) => s.path.join(" ") === "providers")

const providerSummaryFields: ReadonlyArray<string> = summaryFields.provider

const allPages = Options.boolean("all-pages").pipe(
  Options.withDefault(false),
  Options.withDescription("Collect all paginated results"),
)

const listCommand = Command.make(
  "list",
  { ...outputOptions, ...fetchOptions, ...promptTypeOption, allPages },
  (opts) => {
    const listOpts: ListProvidersOpts = { ...commonOptsOf(opts), allPages: opts.allPages }
    return runListCommand(opts, providerSummaryFields, listProviders(listOpts))
  },
).pipe(Command.withDescription("List API providers"))

const slug = Args.text({ name: "slug" }).pipe(Args.withDescription("Provider slug"))

const showCommand = Command.make(
  "show",
  { ...outputOptions, ...fetchOptions, ...promptTypeOption, slug },
  (opts) => {
    const getOpts: GetProviderOpts = {
      ...commonOptsOf(opts),
      ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
    }
    return runItemCommand(opts, providerSummaryFields, getProvider(opts.slug, getOpts))
  },
).pipe(Command.withDescription("One API provider"))

const window = Options.choice("window", PerfWindow.literals).pipe(
  Options.optional,
  Options.withDescription("perf query window"),
)

const interval = Options.choice("interval", PerfInterval.literals).pipe(
  Options.optional,
  Options.withDescription("perf aggregation interval"),
)

const perfCommand = Command.make(
  "perf",
  { ...outputOptions, ...fetchOptions, ...promptTypeOption, slug, window, interval },
  (opts) => {
    const perfOpts: ProviderPerfOpts = {
      ...commonOptsOf(opts),
      ...(Option.isSome(opts.window) ? { window: opts.window.value } : {}),
      ...(Option.isSome(opts.interval) ? { interval: opts.interval.value } : {}),
      ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
    }
    return runItemCommand(opts, [], getProviderPerformance(opts.slug, perfOpts))
  },
).pipe(Command.withDescription("Provider performance history over time (commercial)"))

const startDate = Options.text("start-date").pipe(
  Options.optional,
  Options.withDescription("measurements start date (YYYY-MM-DD)"),
)

const measurementsCommand = Command.make(
  "measurements",
  { ...outputOptions, ...fetchOptions, ...promptTypeOption, slug, startDate },
  (opts) => {
    const measurementsOpts: ProviderMeasurementsOpts = {
      ...commonOptsOf(opts),
      ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
      ...(Option.isSome(opts.startDate) ? { startDate: opts.startDate.value } : {}),
    }
    return runItemCommand(opts, [], getProviderMeasurements(opts.slug, measurementsOpts))
  },
).pipe(
  Command.withDescription("Raw provider measurements, requires per-account approval (commercial)"),
)

const providersBase = Command.make("providers", {}, () =>
  Effect.gen(function* () {
    const output = yield* Output
    if (providersGroupSpec !== undefined) yield* output.stderr(renderGroupHelp(providersGroupSpec))
    const exit = yield* ExitCode
    yield* Ref.set(exit, 2)
  }),
).pipe(Command.withDescription("API providers: list, single lookup, performance, measurements"))

export const providersCommand = providersBase.pipe(
  Command.withSubcommands([listCommand, showCommand, perfCommand, measurementsCommand]),
)
