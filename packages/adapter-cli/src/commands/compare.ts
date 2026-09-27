// `aa compare <query> <query>...`: 주요 지표를 나란히 비교.
import { compareModels, summaryFields } from "@aa/application"
import type { CompareModelsOpts } from "@aa/application"
import { Args, Command } from "@effect/cli"
import { Option } from "effect"
import { dataOptions } from "../global-options.ts"
import { commonOptsOf, runListCommand } from "./support.ts"

// 각 인자는 slug 또는 이름 질의 하나. 공백을 포함하면 따옴표로 감싼다: aa compare "opus 5.5" "opus 5".
const slugs = Args.text({ name: "query" }).pipe(
  Args.atLeast(2),
  Args.withDescription('비교할 모델 slug 또는 질의, 2개 이상. 예: aa compare "opus 5.5" "opus 5"'),
)

export const compareCommand = Command.make("compare", { ...dataOptions, slugs }, (opts) => {
  const compareOpts: CompareModelsOpts = {
    ...commonOptsOf(opts),
    free: opts.free,
    ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
  }
  return runListCommand(opts, summaryFields.languageModel, compareModels(opts.slugs, compareOpts))
}).pipe(
  Command.withDescription(
    '여러 언어 모델을 나란히 비교. 질의에 공백이 있으면 따옴표로 감싼다: aa compare "opus 5.5" "opus 5"',
  ),
)
