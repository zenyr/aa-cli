// 문자열로 받은 CLI 옵션을 도메인 리터럴 타입으로 검증한다.
import { PromptType, UsageError } from "@aa/domain"
import { Effect, Option, Schema } from "effect"

const isPromptType = Schema.is(PromptType)

// `--prompt-type` 값이 지원되는 값인지 검증. 없으면 undefined.
export const parsePromptType = (
  v: Option.Option<string>,
): Effect.Effect<PromptType | undefined, UsageError> => {
  if (Option.isNone(v)) return Effect.succeed(undefined)
  const value = v.value
  if (isPromptType(value)) return Effect.succeed(value)
  return Effect.fail(
    new UsageError({
      message: `invalid --prompt-type: ${value}`,
      hint: `one of: ${PromptType.literals.join(", ")}`,
    }),
  )
}
