// `aa schema <command> [modifier]` 용: 커맨드 이름 -> 출력 data 의 JSON Schema.
import { LanguageModel, MediaModel, Provider } from "@aa/domain"
import { JSONSchema, Schema } from "effect"

const modelsSchema = JSONSchema.make(Schema.Array(LanguageModel))
const modelSchema = JSONSchema.make(LanguageModel)
const mediaSchema = JSONSchema.make(Schema.Array(MediaModel))
const providersSchema = JSONSchema.make(Schema.Array(Provider))
const providerSchema = JSONSchema.make(Provider)
const unknownSchema = {} as const

// `aa schema <command> [modifier]` 의 두 토큰을 합친 키. 예: `schemaFor("model", "perf")`.
export const schemaFor = (command: string, modifier?: string): unknown => {
  const key = modifier === undefined ? command : `${command} ${modifier}`
  switch (key) {
    case "models":
      return modelsSchema
    case "model":
      return modelSchema
    case "model perf":
      return unknownSchema
    case "compare":
      return modelsSchema
    case "media":
      return mediaSchema
    case "providers":
      return providersSchema
    case "providers get":
      return providerSchema
    case "providers perf":
    case "providers measurements":
      return unknownSchema
    case "quota":
    case "endpoints":
    case "raw":
      return unknownSchema
    default:
      return unknownSchema
  }
}

export const knownSchemaCommands: ReadonlyArray<string> = [
  "models",
  "model",
  "model perf",
  "compare",
  "media",
  "providers",
  "providers get",
  "providers perf",
  "providers measurements",
  "quota",
  "endpoints",
  "raw",
]
