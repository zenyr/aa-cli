// `aa-cli schema <command> [modifier]`: 해당 커맨드 출력 data 의 JSON Schema.
import { Args, Command } from "@effect/cli"
import { Effect, Option, Ref } from "effect"
import { ExitCode } from "../exit-code.ts"
import { Output } from "../output.ts"
import { schemaFor } from "../schema-registry.ts"

const command = Args.text({ name: "command" }).pipe(Args.withDescription("Target command name"))

const modifier = Args.text({ name: "modifier" }).pipe(
  Args.optional,
  Args.withDescription("e.g. 'perf' for model perf, 'get' for providers get"),
)

export const schemaCommand = Command.make("schema", { command, modifier }, (opts) =>
  Effect.gen(function* () {
    const output = yield* Output
    const schema = schemaFor(opts.command, Option.getOrUndefined(opts.modifier))
    yield* output.stdout(JSON.stringify(schema))
    const exit = yield* ExitCode
    yield* Ref.set(exit, 0)
  }),
).pipe(Command.withDescription("JSON Schema of a command's data output"))
