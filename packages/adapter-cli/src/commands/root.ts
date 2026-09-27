// 최상위 `aa` 커맨드: 모든 서브커맨드를 조립한다.
import { Command } from "@effect/cli"
import { Effect, Ref } from "effect"
import { ExitCode } from "../exit-code.ts"
import { Output } from "../output.ts"
import { compareCommand } from "./compare.ts"
import { endpointsCommand } from "./endpoints.ts"
import { mediaCommand } from "./media.ts"
import { modelCommand } from "./model.ts"
import { modelsCommand } from "./models.ts"
import { providersCommand } from "./providers.ts"
import { quotaCommand } from "./quota.ts"
import { rawCommand } from "./raw.ts"
import { schemaCommand } from "./schema.ts"

const base = Command.make("aa", {}, () =>
  Effect.gen(function* () {
    const output = yield* Output
    yield* output.stderr("aa: usage: a command is required (see --help)")
    const exit = yield* ExitCode
    yield* Ref.set(exit, 2)
  }),
).pipe(
  Command.withDescription(
    [
      "Artificial Analysis Data API CLI",
      "",
      "예:",
      "  aa find opus 5.5",
      '  aa compare "opus 5.5" "opus 5" --fields slug,pricing.price_1m_input_tokens',
      "  aa models --sort -evaluations.artificial_analysis_intelligence_index --limit 10",
      "  aa quota",
    ].join("\n"),
  ),
)

export const rootCommand = base.pipe(
  Command.withSubcommands([
    modelsCommand,
    modelCommand,
    compareCommand,
    providersCommand,
    mediaCommand,
    quotaCommand,
    endpointsCommand,
    schemaCommand,
    rawCommand,
  ]),
)
