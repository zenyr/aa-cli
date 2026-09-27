// `aa-cli schema <command...>` 용: 커맨드 경로 -> 출력 data 의 JSON Schema.
import { LanguageModel, MediaModel, Provider } from "@aa/domain"
import { JSONSchema, Schema } from "effect"

const modelsSchema = JSONSchema.make(Schema.Array(LanguageModel))
const modelSchema = JSONSchema.make(LanguageModel)
const mediaSchema = JSONSchema.make(Schema.Array(MediaModel))
const providersSchema = JSONSchema.make(Schema.Array(Provider))
const providerSchema = JSONSchema.make(Provider)
const unknownSchema = {} as const

// `aa-cli schema <command...>` 의 커맨드 경로를 합친 키. 예: `schemaFor(["providers", "show"])`.
export const schemaFor = (path: ReadonlyArray<string>): unknown => {
  const key = path.join(" ")
  switch (key) {
    case "list":
      return modelsSchema
    case "show":
      return modelSchema
    case "perf":
      return unknownSchema
    case "compare":
      return modelsSchema
    case "find":
      return modelsSchema
    case "media":
      return mediaSchema
    case "providers list":
      return providersSchema
    case "providers show":
      return providerSchema
    case "providers perf":
    case "providers measurements":
      return unknownSchema
    case "quota":
    case "endpoints":
    case "raw":
    case "cache clear":
      return unknownSchema
    default:
      return unknownSchema
  }
}

export const knownSchemaCommands: ReadonlyArray<string> = [
  "list",
  "show",
  "perf",
  "compare",
  "find",
  "media",
  "providers list",
  "providers show",
  "providers perf",
  "providers measurements",
  "quota",
  "endpoints",
  "raw",
  "cache clear",
]
