// 커맨드 핸들러 공통 배관: Result<A> -> 필드 파이프라인 -> 포맷 -> Output, 에러 -> stderr + 종료 코드.
import type { CommonOpts, Result } from "@aa/application"
import { exitCodeOf, type AaError } from "@aa/domain"
import { Effect, Option, Ref } from "effect"
import { formatError } from "../format/error.ts"
import { formatOutput, toOutputMeta, type Row } from "../format/index.ts"
import { resolveCacheMode, resolveFormat, type DataOptionsValue } from "../global-options.ts"
import { ExitCode } from "../exit-code.ts"
import { Output } from "../output.ts"
import { applyRowPipeline } from "../pipeline.ts"

export const commonOptsOf = (v: DataOptionsValue): CommonOpts => {
  const ttlSeconds = Option.getOrUndefined(v.ttl)
  return ttlSeconds === undefined
    ? { cache: resolveCacheMode(v) }
    : { cache: resolveCacheMode(v), ttlSeconds }
}

// 성공 시 exit code 0, 실패(AaError) 시 렌더링 후 README 종료 코드 표를 따른다. 이 Effect 는 실패하지 않는다.
const finish = <A>(
  opts: DataOptionsValue,
  effect: Effect.Effect<A, AaError>,
  onSuccess: (a: A) => Effect.Effect<void, never, Output | ExitCode>,
): Effect.Effect<void, never, Output | ExitCode> =>
  Effect.gen(function* () {
    const output = yield* Output
    const exit = yield* ExitCode
    const result = yield* Effect.either(effect)
    const format = resolveFormat(opts, output.isTTY)
    if (result._tag === "Left") {
      for (const line of formatError(format, result.left)) yield* output.stderr(line)
      yield* Ref.set(exit, exitCodeOf(result.left))
      return
    }
    yield* onSuccess(result.right)
    yield* Ref.set(exit, 0)
  })

const writeRows = (
  format: ReturnType<typeof resolveFormat>,
  data: unknown,
  result: Result<unknown>,
): Effect.Effect<void, never, Output> =>
  Effect.gen(function* () {
    const output = yield* Output
    const { stdout, stderr } = formatOutput(format, data, toOutputMeta(result.meta, result.notices))
    yield* output.stdout(stdout)
    for (const line of stderr) yield* output.stderr(line)
  })

// 목록 커맨드: 필드 프로젝션 + 정렬 + 필터 + limit 을 모두 적용한다.
export const runListCommand = (
  opts: DataOptionsValue,
  summaryFields: ReadonlyArray<string>,
  effect: Effect.Effect<Result<ReadonlyArray<Row>>, AaError>,
): Effect.Effect<void, never, Output | ExitCode> =>
  finish(opts, effect, (result) =>
    Effect.gen(function* () {
      const output = yield* Output
      const format = resolveFormat(opts, output.isTTY)
      const rows = yield* applyRowPipeline(result.data, {
        fields: Option.getOrUndefined(opts.fields),
        summaryFields,
        full: opts.full,
        sort: Option.getOrUndefined(opts.sort),
        filters: opts.filter,
        limit: Option.getOrUndefined(opts.limit),
      }).pipe(
        Effect.catchAll((e) =>
          Effect.gen(function* () {
            for (const line of formatError(format, e)) yield* output.stderr(line)
            const exit = yield* ExitCode
            yield* Ref.set(exit, exitCodeOf(e))
            return [] as ReadonlyArray<Row>
          }),
        ),
      )
      yield* writeRows(format, rows, result)
    }),
  )

// 단건 커맨드: 필드 프로젝션만 적용한다 (정렬/필터/limit 은 의미 없음).
export const runItemCommand = (
  opts: DataOptionsValue,
  summaryFields: ReadonlyArray<string>,
  effect: Effect.Effect<Result<Row>, AaError>,
): Effect.Effect<void, never, Output | ExitCode> =>
  finish(opts, effect, (result) =>
    Effect.gen(function* () {
      const output = yield* Output
      const format = resolveFormat(opts, output.isTTY)
      const rows = yield* applyRowPipeline([result.data], {
        fields: Option.getOrUndefined(opts.fields),
        summaryFields,
        full: opts.full,
        sort: undefined,
        filters: [],
        limit: undefined,
      }).pipe(
        Effect.catchAll((e) =>
          Effect.gen(function* () {
            for (const line of formatError(format, e)) yield* output.stderr(line)
            const exit = yield* ExitCode
            yield* Ref.set(exit, exitCodeOf(e))
            return [] as ReadonlyArray<Row>
          }),
        ),
      )
      const data = format === "json" ? (rows[0] ?? null) : rows
      yield* writeRows(format, data, result)
    }),
  )

// 프로젝션이 필요 없는 커맨드 (quota, endpoints, raw 등): 그대로 rows 로 출력.
export const runRawCommand = (
  opts: DataOptionsValue,
  effect: Effect.Effect<Result<unknown>, AaError>,
): Effect.Effect<void, never, Output | ExitCode> =>
  finish(opts, effect, (result) =>
    Effect.gen(function* () {
      const output = yield* Output
      const format = resolveFormat(opts, output.isTTY)
      yield* writeRows(format, result.data, result)
    }),
  )
