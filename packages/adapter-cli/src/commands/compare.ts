// `aa compare <slug> <slug>...`: 주요 지표를 나란히 비교.
import { compareModels, summaryFields } from "@aa/application"
import type { CompareModelsOpts } from "@aa/application"
import { Args, Command } from "@effect/cli"
import { Option } from "effect"
import { dataOptions } from "../global-options.ts"
import { commonOptsOf, runListCommand } from "./support.ts"

const slugs = Args.text({ name: "slug" }).pipe(
  Args.atLeast(2),
  Args.withDescription("비교할 모델 slug, 2개 이상"),
)

export const compareCommand = Command.make("compare", { ...dataOptions, slugs }, (opts) => {
  const compareOpts: CompareModelsOpts = {
    ...commonOptsOf(opts),
    free: opts.free,
    ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
  }
  return runListCommand(opts, summaryFields.languageModel, compareModels(opts.slugs, compareOpts))
}).pipe(Command.withDescription("여러 언어 모델을 나란히 비교"))
