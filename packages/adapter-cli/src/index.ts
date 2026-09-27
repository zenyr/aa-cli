// 드라이빙 어댑터: @effect/cli 커맨드 + 출력 포매터. 조립 루트(apps/cli)가 이 `run` 을 호출한다.
import type { AaApi, Cache } from "@aa/domain"
import { CliConfig, Command, ValidationError } from "@effect/cli"
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Path } from "@effect/platform/Path"
import type { Terminal } from "@effect/platform/Terminal"
import { Effect, Ref } from "effect"
import { rootCommand } from "./commands/root.ts"
import { ExitCode } from "./exit-code.ts"
import { renderCommandHelp, renderGroupHelp, resolveHelpTarget } from "./help.ts"
import { knownCommandNames } from "./help-spec.ts"
import { noColorConsoleLayer } from "./no-color-console.ts"
import { Output } from "./output.ts"
import { rootHelpText } from "./root-help.ts"

export { Output, OutputLive } from "./output.ts"

// `package.json` 을 읽지 않고 고정 버전을 쓴다 (배포 파이프라인이 필요하면 빌드 시점에 주입).
export const cliVersion = "0.1.0"

// 빌트인 옵션(--completions, --log-level, --wizard)과 타입 표기를 숨겨 서브커맨드 도움말을 짧게 유지한다.
const cliConfigLayer = CliConfig.layer({ showBuiltIns: false, showTypes: false })

const runCli = Command.run(rootCommand, { name: "aa-cli", version: cliVersion })

const isBare = (userArgs: ReadonlyArray<string>): boolean => userArgs.length === 0

const isUnknownCommand = (userArgs: ReadonlyArray<string>): boolean =>
  userArgs.length > 0 &&
  userArgs[0] !== undefined &&
  !userArgs[0].startsWith("-") &&
  !knownCommandNames.includes(userArgs[0])

// 도움말 텍스트로 target 을 렌더링한다. 루트/그룹/커맨드 도움말 모두 `help-spec.ts` 에서 나온다.
const renderHelp = (target: NonNullable<ReturnType<typeof resolveHelpTarget>>): string => {
  if (target.kind === "root") return rootHelpText
  if (target.kind === "group") return renderGroupHelp(target.spec)
  return renderCommandHelp(target.spec)
}

// argv -> 종료 코드. 실패하지 않는다: `@effect/cli` 검증 오류는 exit 2 (도움말 요청은 0)로 흡수한다.
export const run = (
  argv: ReadonlyArray<string>,
): Effect.Effect<number, never, AaApi | Cache | Output | FileSystem | Path | Terminal> =>
  Effect.gen(function* () {
    const userArgs = argv.slice(2)
    const output = yield* Output

    if (isBare(userArgs)) {
      yield* output.stderr(rootHelpText)
      return 2
    }

    // `--help`/`-h` 는 argv 어디에 있든 여기서 가로챈다. `@effect/cli` 도움말 렌더링을 거치지 않는다.
    const helpTarget = resolveHelpTarget(userArgs)
    if (helpTarget !== undefined) {
      yield* output.stdout(renderHelp(helpTarget))
      return 0
    }

    if (isUnknownCommand(userArgs)) {
      yield* output.stderr(`aa-cli: unknown command '${userArgs[0]}' (run 'aa-cli --help')`)
      return 2
    }

    const exit = yield* Ref.make(0)
    const outcome = yield* runCli(argv).pipe(
      Effect.provideService(ExitCode, exit),
      Effect.provide(noColorConsoleLayer()),
      Effect.provide(cliConfigLayer),
      Effect.either,
    )
    if (outcome._tag === "Left") {
      return ValidationError.isHelpRequested(outcome.left) ? 0 : 2
    }
    return yield* Ref.get(exit)
  })
