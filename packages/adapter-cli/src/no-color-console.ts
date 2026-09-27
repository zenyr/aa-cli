// `@effect/cli` 도움말/에러를 우리 Output 으로 리다이렉트하고, TTY 가 아니거나 NO_COLOR 면 ANSI 를 벗긴다.
import { Console, type Context, Effect, Layer } from "effect"
import { Output } from "./output.ts"

type OutputService = Context.Tag.Service<typeof Output>

// oxlint-disable-next-line no-control-regex -- ANSI escape 시퀀스를 걸러내려면 제어 문자가 필요하다.
const ansiPattern = /\u001b\[[0-9;]*m/g

const stripAnsi = (value: string): string => value.replace(ansiPattern, "")

const joinArgs = (args: ReadonlyArray<unknown>): string =>
  args.map((a) => (typeof a === "string" ? a : String(a))).join(" ")

const noop: Effect.Effect<void> = Effect.void

// 사용되지 않는 Console 메서드는 no-op 으로 둔다 (이 CLI 는 log/error 만 쓴다).
const unsafeNoop = {
  assert: () => {},
  clear: () => {},
  count: () => {},
  countReset: () => {},
  debug: () => {},
  dir: () => {},
  dirxml: () => {},
  error: () => {},
  group: () => {},
  groupCollapsed: () => {},
  groupEnd: () => {},
  info: () => {},
  log: () => {},
  table: () => {},
  time: () => {},
  timeEnd: () => {},
  timeLog: () => {},
  trace: () => {},
  warn: () => {},
}

// Output 을 목적지로 삼는 Console 구현. `shouldStrip` 이 참이면 ANSI 시퀀스를 제거한다.
export const makeOutputConsole = (
  output: OutputService,
  shouldStrip: boolean,
): Console.Console => ({
  [Console.TypeId]: Console.TypeId,
  assert: () => noop,
  clear: noop,
  count: () => noop,
  countReset: () => noop,
  debug: () => noop,
  dir: () => noop,
  dirxml: () => noop,
  error: (...args) => output.stderr(shouldStrip ? stripAnsi(joinArgs(args)) : joinArgs(args)),
  group: () => noop,
  groupEnd: noop,
  info: (...args) => output.stdout(shouldStrip ? stripAnsi(joinArgs(args)) : joinArgs(args)),
  log: (...args) => output.stdout(shouldStrip ? stripAnsi(joinArgs(args)) : joinArgs(args)),
  table: () => noop,
  time: () => noop,
  timeEnd: () => noop,
  timeLog: () => noop,
  trace: () => noop,
  warn: (...args) => output.stderr(shouldStrip ? stripAnsi(joinArgs(args)) : joinArgs(args)),
  unsafe: unsafeNoop,
})

// 기본 서비스인 Console 은 별도 FiberRef 로 조회되므로, `Layer.effect` 가 아니라 `Console.setConsole` 로 교체해야 한다.
export const noColorConsoleLayer = (): Layer.Layer<never, never, Output> =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const output = yield* Output
      const shouldStrip = !output.isTTY || output.noColor
      return Console.setConsole(makeOutputConsole(output, shouldStrip))
    }),
  )
