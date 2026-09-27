import { Schema } from "effect"
import { ModelCreator } from "./model-creator.ts"

// 지표(evaluations/pricing/performance)는 AA 쪽에서 계속 늘어나므로 열린 record 로 둔다.
// 값은 측정 안 됐으면 null 이지 0 이 아니다 (SUMMARY.md 컨벤션).
const MetricRecord = Schema.Record({ key: Schema.String, value: Schema.NullOr(Schema.Number) })

// Free 응답과 Pro 응답 모두를 아우르는 언어 모델 엔티티.
// Pro 전용 필드(reasoning_model, context_window_tokens 등)는 optional 로 둔다.
export class LanguageModel extends Schema.Class<LanguageModel>("LanguageModel")({
  id: Schema.String,
  name: Schema.String,
  slug: Schema.String,
  release_date: Schema.NullOr(Schema.String),
  model_creator: ModelCreator,
  evaluations: MetricRecord,
  pricing: MetricRecord,
  performance: MetricRecord,
  reasoning_model: Schema.optional(Schema.Boolean),
  context_window_tokens: Schema.optional(Schema.NullOr(Schema.Number)),
  parameters: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.NullOr(Schema.Number) }),
  ),
  modalities: Schema.optional(Schema.Unknown),
  providers: Schema.optional(Schema.Unknown),
}) {}
