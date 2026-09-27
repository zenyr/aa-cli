import { Schema } from "effect"

// 모델 제작사. country 등은 Pro 응답에만 존재할 수 있어 선택 필드로 둔다.
export class ModelCreator extends Schema.Class<ModelCreator>("ModelCreator")({
  id: Schema.String,
  name: Schema.String,
  country: Schema.optional(Schema.String),
}) {}
