// JSON / JSONL 포매터. 키 순서를 고정하고 null 은 그대로 둔다.
import type { OutputMeta, Row } from "./types.ts"

// data + meta 를 안정적인 키 순서로 직렬화한다 (data 먼저, meta 다음, meta 내부도 고정 순서).
export const formatJson = (data: unknown, meta: OutputMeta): string =>
  JSON.stringify(
    {
      data,
      meta: {
        tier: meta.tier,
        rate_limit: meta.rate_limit,
        source: meta.source,
        cached: meta.cached,
        fetched_at: meta.fetched_at,
        attribution: meta.attribution,
        notices: meta.notices,
      },
    },
    null,
    2,
  )

// 행마다 한 줄의 JSON. meta 없음.
export const formatJsonl = (rows: ReadonlyArray<Row>): string =>
  rows.map((row) => JSON.stringify(row)).join("\n")
