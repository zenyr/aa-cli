// 주입 가능한 출력 포트. 테스트에서는 인메모리 구현으로 교체한다.
import { Context, Effect, Layer } from "effect"

export class Output extends Context.Tag("@aa/adapter-cli/Output")<
  Output,
  {
    readonly stdout: (line: string) => Effect.Effect<void>
    readonly stderr: (line: string) => Effect.Effect<void>
    readonly isTTY: boolean
    readonly noColor: boolean
  }
>() {}

// 실제 process.stdout/stderr 에 쓰는 구현. `process.*` 접근은 이 파일에만 둔다.
export const OutputLive = Layer.succeed(Output, {
  stdout: (line) => Effect.sync(() => process.stdout.write(`${line}\n`)),
  stderr: (line) => Effect.sync(() => process.stderr.write(`${line}\n`)),
  isTTY: process.stdout.isTTY === true,
  noColor: process.env["NO_COLOR"] !== undefined,
})
