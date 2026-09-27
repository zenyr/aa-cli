import { Schema } from "effect"

// Language Model Provider (commercial 전용). 응답 형태가 아직 안정적이지 않아 느슨하게 둔다.
export class Provider extends Schema.Class<Provider>("Provider")({
  id: Schema.String,
  name: Schema.String,
  slug: Schema.String,
  pricing: Schema.optional(Schema.Unknown),
  performance: Schema.optional(Schema.Unknown),
}) {}
