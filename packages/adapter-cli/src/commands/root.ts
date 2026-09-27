// 최상위 `aa-cli` 커맨드: 모든 서브커맨드를 조립한다.
import { Command } from "@effect/cli"
import { Effect, Ref } from "effect"
import { ExitCode } from "../exit-code.ts"
import { Output } from "../output.ts"
import { cacheCommand } from "./cache.ts"
import { compareCommand } from "./compare.ts"
import { endpointsCommand } from "./endpoints.ts"
import { findCommand } from "./find.ts"
import { listCommand } from "./list.ts"
import { mediaCommand } from "./media.ts"
import { perfCommand } from "./perf.ts"
import { providersCommand } from "./providers.ts"
import { quotaCommand } from "./quota.ts"
import { rawCommand } from "./raw.ts"
import { schemaCommand } from "./schema.ts"
import { showCommand } from "./show.ts"

const base = Command.make("aa-cli", {}, () =>
  Effect.gen(function* () {
    const output = yield* Output
    yield* output.stderr("aa-cli: usage: a command is required (see --help)")
    const exit = yield* ExitCode
    yield* Ref.set(exit, 2)
  }),
).pipe(Command.withDescription("Artificial Analysis Data API for agents and humans"))

export const rootCommand = base.pipe(
  Command.withSubcommands([
    findCommand,
    showCommand,
    compareCommand,
    listCommand,
    perfCommand,
    mediaCommand,
    providersCommand,
    quotaCommand,
    endpointsCommand,
    schemaCommand,
    rawCommand,
    cacheCommand,
  ]),
)
