import { Schema } from "effect"
import { Pagination } from "./pagination.ts"
import { Tier } from "./tier.ts"

// 리스트 엔드포인트 응답 envelope: { tier, intelligence_index_version?, pagination?, data: A[] }
export const ListEnvelope = <A, I, R>(item: Schema.Schema<A, I, R>) =>
  Schema.Struct({
    tier: Tier,
    intelligence_index_version: Schema.optional(Schema.Number),
    pagination: Schema.optional(Pagination),
    data: Schema.Array(item),
  })

// 단건 엔드포인트 응답 envelope: { tier, intelligence_index_version?, data: A }
export const ItemEnvelope = <A, I, R>(item: Schema.Schema<A, I, R>) =>
  Schema.Struct({
    tier: Tier,
    intelligence_index_version: Schema.optional(Schema.Number),
    data: item,
  })
