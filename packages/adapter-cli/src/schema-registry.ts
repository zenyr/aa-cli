// `aa schema <command>` 용: 커맨드 이름 -> 출력 data 의 JSON Schema.
import { LanguageModel, MediaModel, Provider } from "@aa/domain"
import { JSONSchema, Schema } from "effect"

const modelsSchema = JSONSchema.make(Schema.Array(LanguageModel))
const modelSchema = JSONSchema.make(LanguageModel)
const mediaSchema = JSONSchema.make(Schema.Array(MediaModel))
const providersSchema = JSONSchema.make(Schema.Array(Provider))
const providerSchema = JSONSchema.make(Provider)
const unknownSchema = {} as const

// commands.ts 의 커맨드 이름과 1:1 로 맞춘다. 목록에 없는 커맨드(quota, endpoints, raw 등)는 `{}`.
export const schemaFor = (command: string): unknown => {
  switch (command) {
    case "models":
      return modelsSchema
    case "model":
      return modelSchema
    case "model perf":
      return unknownSchema
    case "compare":
      return unknownSchema
    case "media":
      return mediaSchema
    case "providers":
      return providersSchema
    case "provider":
      return providerSchema
    case "providers perf":
    case "providers measurements":
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
  "provider",
  "providers perf",
  "providers measurements",
]
