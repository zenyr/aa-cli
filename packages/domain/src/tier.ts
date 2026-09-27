import { Schema } from "effect"

// AA 계정 티어. free < pro < commercial.
export const Tier = Schema.Literal("free", "pro", "commercial")
export type Tier = typeof Tier.Type
