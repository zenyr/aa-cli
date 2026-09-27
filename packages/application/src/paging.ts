import type { AaApi, AaError, Cache, ResponseMeta } from "@aa/domain"
import { Effect } from "effect"

// 한 페이지 조회 결과. `pagination.has_more` 판단은 호출부에서 미리 해서 넘긴다.
export interface PageOutcome<A> {
  readonly data: ReadonlyArray<A>
  readonly hasMore: boolean
  readonly meta: ResponseMeta
}

// 모아진 전체 페이지. 메타는 마지막 페이지 것을 쓴다.
export interface CollectedPages<A> {
  readonly data: ReadonlyArray<A>
  readonly meta: ResponseMeta
}

// `pagination.has_more` 를 따라 순차로 페이지를 모아 이어붙인다.
export const collectAllPages = <A>(
  fetchPage: (page: number) => Effect.Effect<PageOutcome<A>, AaError, AaApi | Cache>,
): Effect.Effect<CollectedPages<A>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const first = yield* fetchPage(1)
    let data = first.data
    let hasMore = first.hasMore
    let meta = first.meta
    let page = 1
    while (hasMore) {
      page += 1
      const next = yield* fetchPage(page)
      data = [...data, ...next.data]
      hasMore = next.hasMore
      meta = next.meta
    }
    return { data, meta }
  })
