import { Schema } from "effect"
import { ModelCreator } from "./model-creator.ts"

// 미디어(이미지/비디오/음악/음성) 아레나 응답. 11개 kind 마다 필드가 조금씩 달라
// (elo/ci_95/rank vs. 다른 지표) 최소 공통 필드만 엄격히 두고 나머지는 통과시킨다.
export class MediaModel extends Schema.Class<MediaModel>("MediaModel")({
  id: Schema.String,
  name: Schema.String,
  slug: Schema.String,
  model_creator: Schema.optional(ModelCreator),
  release_date: Schema.optional(Schema.NullOr(Schema.String)),
  elo: Schema.optional(Schema.NullOr(Schema.Number)),
  ci_95: Schema.optional(Schema.NullOr(Schema.Number)),
  rank: Schema.optional(Schema.NullOr(Schema.Number)),
  samples: Schema.optional(Schema.NullOr(Schema.Number)),
  price_per_1k_images: Schema.optional(Schema.NullOr(Schema.Number)),
  open_weights_url: Schema.optional(Schema.NullOr(Schema.String)),
  categories: Schema.optional(Schema.Unknown),
  genres: Schema.optional(Schema.Unknown),
}) {}
