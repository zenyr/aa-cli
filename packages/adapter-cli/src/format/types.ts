// 포매터 공용 타입.
import type { ResponseMeta } from "@aa/domain"

// CLI 가 다루는 한 "행". 필드 프로젝션/정렬/필터 이후의 평면 레코드.
export type Row = Record<string, unknown>

export interface OutputMeta {
  readonly tier: ResponseMeta["tier"]
  readonly rate_limit: ResponseMeta["rate_limit"]
  readonly source: string
  readonly cached: boolean
  readonly fetched_at: string
  readonly attribution: string
  readonly notices: ReadonlyArray<string>
}

export const attribution = "Data: Artificial Analysis (https://artificialanalysis.ai)"

export const toOutputMeta = (meta: ResponseMeta, notices: ReadonlyArray<string>): OutputMeta => ({
  tier: meta.tier,
  rate_limit: meta.rate_limit,
  source: meta.source,
  cached: meta.cached,
  fetched_at: meta.fetched_at,
  attribution,
  notices,
})

export type Format = "json" | "jsonl" | "table" | "tsv" | "md"
