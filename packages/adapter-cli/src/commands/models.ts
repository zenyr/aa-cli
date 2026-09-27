// `aa-cli models`: 언어 모델 목록.
import { listLanguageModels, summaryFields, type ListLanguageModelsOpts } from "@aa/application"
import { Command, Options } from "@effect/cli"
import { Option } from "effect"
import { dataOptions, freeOptOf } from "../global-options.ts"
import { commonOptsOf, runListCommand } from "./support.ts"

const allPages = Options.boolean("all-pages").pipe(
  Options.withDefault(false),
  Options.withDescription("페이지네이션된 결과를 모두 모아서 반환"),
)

const page = Options.integer("page").pipe(Options.optional, Options.withDescription("페이지 번호"))

export const modelsCommand = Command.make("models", { ...dataOptions, allPages, page }, (opts) => {
  const listOpts: ListLanguageModelsOpts = {
    ...commonOptsOf(opts),
    ...freeOptOf(opts),
    allPages: opts.allPages,
    ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
    ...(Option.isSome(opts.page) ? { page: opts.page.value } : {}),
  }
  return runListCommand(opts, summaryFields.languageModel, listLanguageModels(listOpts))
}).pipe(Command.withDescription("언어 모델 목록"))
