// `aa-cli find <query...>`: 이름/slug 키워드로 언어 모델을 찾아 랭킹 순으로 나열.
import { findLanguageModels, summaryFields } from "@aa/application"
import type { FindLanguageModelsOpts } from "@aa/application"
import { Args, Command } from "@effect/cli"
import { Option } from "effect"
import { dataOptions, freeOptOf } from "../global-options.ts"
import { commonOptsOf, runListCommand } from "./support.ts"

// 여러 단어를 공백으로 이어붙여 하나의 질의로 만든다: `aa-cli find gpt 6 luna` == `aa-cli find "gpt 6 luna"`.
const words = Args.text({ name: "word" }).pipe(
  Args.atLeast(1),
  Args.withDescription("찾을 키워드, 여러 단어 가능. 예: aa-cli find opus 5.5"),
)

export const findCommand = Command.make("find", { ...dataOptions, words }, (opts) => {
  const query = opts.words.join(" ")
  const findOpts: FindLanguageModelsOpts = {
    ...commonOptsOf(opts),
    ...freeOptOf(opts),
    ...(Option.isSome(opts.promptType) ? { promptType: opts.promptType.value } : {}),
  }
  return runListCommand(opts, summaryFields.languageModel, findLanguageModels(query, findOpts))
}).pipe(Command.withDescription("키워드로 언어 모델 검색 (이름/slug 랭킹 매칭)"))
