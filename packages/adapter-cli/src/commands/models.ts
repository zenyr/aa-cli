// `aa models`: 언어 모델 목록.
import { listLanguageModels, summaryFields, type ListLanguageModelsOpts } from "@aa/application"
import { Command, Options } from "@effect/cli"
import { Effect, Option } from "effect"
import { dataOptions } from "../global-options.ts"
import { parsePromptType } from "../validate.ts"
import { commonOptsOf, runListCommand } from "./support.ts"

const allPages = Options.boolean("all-pages").pipe(
  Options.withDefault(false),
  Options.withDescription("페이지네이션된 결과를 모두 모아서 반환"),
)

const page = Options.integer("page").pipe(Options.optional, Options.withDescription("페이지 번호"))

export const modelsCommand = Command.make("models", { ...dataOptions, allPages, page }, (opts) => {
  const effect = parsePromptType(opts.promptType).pipe(
    Effect.flatMap((promptType) => {
      const listOpts: ListLanguageModelsOpts = {
        ...commonOptsOf(opts),
        free: opts.free,
        allPages: opts.allPages,
        ...(promptType !== undefined ? { promptType } : {}),
        ...(Option.isSome(opts.page) ? { page: opts.page.value } : {}),
      }
      return listLanguageModels(listOpts)
    }),
  )
  return runListCommand(opts, summaryFields.languageModel, effect)
}).pipe(Command.withDescription("언어 모델 목록"))
