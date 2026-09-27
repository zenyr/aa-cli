// `aa-cli compare <query> <query>...`: 주요 지표를 나란히 비교.
import { compareModels, summaryFields } from "@aa/application"
import type { CompareModelsOpts } from "@aa/application"
import { Args, Command } from "@effect/cli"
import { Option } from "effect"
import {
  fetchOptions,
  freeOptOf,
  freeOption,
  outputOptions,
  promptTypeOption,
} from "../global-options.ts"
import { commonOptsOf, runListCommand } from "./support.ts"

// 각 인자는 slug 또는 이름 질의 하나. 공백을 포함하면 따옴표로 감싼다: aa-cli compare "opus 5.5" "opus 5".
const slugs = Args.text({ name: "query" }).pipe(
  Args.atLeast(2),
  Args.withDescription(
    'Two or more model slugs or queries, e.g. aa-cli compare "opus 5.5" "opus 5"',
  ),
)

export const compareCommand = Command.make(
  "compare",
  { ...outputOptions, ...fetchOptions, ...freeOption, ...promptTypeOption, slugs },
  (opts) => {
    const compareOpts: CompareModelsOpts = {
      ...commonOptsOf(opts),
      ...freeOptOf(opts),
      ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
    }
    return runListCommand(opts, summaryFields.languageModel, compareModels(opts.slugs, compareOpts))
  },
).pipe(
  Command.withDescription(
    'Compare language models side by side. Quote queries with spaces: aa-cli compare "opus 5.5" "opus 5"',
  ),
)
