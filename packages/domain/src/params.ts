import { Schema } from "effect"

// 언어 모델 엔드포인트 공통 쿼리 파라미터.
export const PromptType = Schema.Literal(
  "medium",
  "long",
  "100k",
  "vision_single_image",
  "medium_coding",
  "medium_parallel",
)
export type PromptType = typeof PromptType.Type

// performance-over-time 조회 기간.
export const PerfWindow = Schema.Literal("7d", "30d", "90d")
export type PerfWindow = typeof PerfWindow.Type

// performance-over-time 집계 간격.
export const PerfInterval = Schema.Literal("daily", "weekly", "monthly")
export type PerfInterval = typeof PerfInterval.Type
