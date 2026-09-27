// 드라이빙 어댑터: @effect/cli 커맨드 + 출력 포매터. 조립 루트(apps/cli)가 이 `run` 을 호출한다.
import type { AaApi, Cache } from "@aa/domain"
import { Command, ValidationError } from "@effect/cli"
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Path } from "@effect/platform/Path"
import type { Terminal } from "@effect/platform/Terminal"
import { Effect, Ref } from "effect"
import { rootCommand } from "./commands/root.ts"
import { ExitCode } from "./exit-code.ts"
import { noColorConsoleLayer } from "./no-color-console.ts"
import { Output } from "./output.ts"

export { Output, OutputLive } from "./output.ts"

// `package.json` 을 읽지 않고 고정 버전을 쓴다 (배포 파이프라인이 필요하면 빌드 시점에 주입).
export const cliVersion = "0.1.0"

const runCli = Command.run(rootCommand, { name: "aa-cli", version: cliVersion })

// argv -> 종료 코드. 실패하지 않는다: `@effect/cli` 검증 오류는 exit 2 (도움말 요청은 0)로 흡수한다.
export const run = (
  argv: ReadonlyArray<string>,
): Effect.Effect<number, never, AaApi | Cache | Output | FileSystem | Path | Terminal> =>
  Effect.gen(function* () {
    const exit = yield* Ref.make(0)
    const outcome = yield* runCli(argv).pipe(
      Effect.provideService(ExitCode, exit),
      Effect.provide(noColorConsoleLayer()),
      Effect.either,
    )
    if (outcome._tag === "Left") {
      return ValidationError.isHelpRequested(outcome.left) ? 0 : 2
    }
    return yield* Ref.get(exit)
  })
