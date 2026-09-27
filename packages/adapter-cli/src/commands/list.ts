// `aa-cli list`: 언어 모델 목록.
import { listLanguageModels, summaryFields, type ListLanguageModelsOpts } from "@aa/application"
import { Command, Options } from "@effect/cli"
import { Option } from "effect"
import {
  fetchOptions,
  freeOptOf,
  freeOption,
  outputOptions,
  promptTypeOption,
} from "../global-options.ts"
import { commonOptsOf, runListCommand } from "./support.ts"

const allPages = Options.boolean("all-pages").pipe(
  Options.withDefault(false),
  Options.withDescription("Collect all paginated results"),
)

const page = Options.integer("page").pipe(Options.optional, Options.withDescription("Page number"))

export const listCommand = Command.make(
  "list",
  { ...outputOptions, ...fetchOptions, ...freeOption, ...promptTypeOption, allPages, page },
  (opts) => {
    const listOpts: ListLanguageModelsOpts = {
      ...commonOptsOf(opts),
      ...freeOptOf(opts),
      allPages: opts.allPages,
      ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
      ...(Option.isSome(opts.page) ? { page: opts.page.value } : {}),
    }
    return runListCommand(opts, summaryFields.languageModel, listLanguageModels(listOpts))
  },
).pipe(Command.withDescription("List language models"))
