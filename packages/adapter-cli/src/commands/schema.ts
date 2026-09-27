// `aa-cli schema <command...>`: 해당 커맨드 출력 data 의 JSON Schema.
import { Args, Command } from "@effect/cli"
import { Effect, Ref } from "effect"
import { ExitCode } from "../exit-code.ts"
import { Output } from "../output.ts"
import { schemaFor } from "../schema-registry.ts"

const command = Args.text({ name: "command" }).pipe(
  Args.atLeast(1),
  Args.withDescription("Target command path, e.g. 'providers show' or 'list'"),
)

export const schemaCommand = Command.make("schema", { command }, (opts) =>
  Effect.gen(function* () {
    const output = yield* Output
    const schema = schemaFor(opts.command)
    yield* output.stdout(JSON.stringify(schema))
    const exit = yield* ExitCode
    yield* Ref.set(exit, 0)
  }),
).pipe(Command.withDescription("JSON Schema of a command's data output"))
