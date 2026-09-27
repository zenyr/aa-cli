// `aa-cli show <query>`: 언어 모델 단건 조회.
import { getLanguageModel, summaryFields } from "@aa/application"
import type { GetLanguageModelOpts } from "@aa/application"
import { Args, Command } from "@effect/cli"
import { Option } from "effect"
import { fetchOptions, outputOptions, promptTypeOption } from "../global-options.ts"
import { commonOptsOf, runItemCommand } from "./support.ts"

const query = Args.text({ name: "query" }).pipe(
  Args.withDescription('slug or name query, e.g. aa-cli show "opus 5.5"'),
)

export const showCommand = Command.make(
  "show",
  { ...outputOptions, ...fetchOptions, ...promptTypeOption, query },
  (opts) => {
    const getOpts: GetLanguageModelOpts = {
      ...commonOptsOf(opts),
      ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
    }
    return runItemCommand(opts, summaryFields.languageModel, getLanguageModel(opts.query, getOpts))
  },
).pipe(
  Command.withDescription('One language model. Quote queries with spaces: aa-cli show "opus 5.5"'),
)
