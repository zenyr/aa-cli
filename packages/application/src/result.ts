import type { ResponseMeta } from "@aa/domain"

// 유스케이스 반환 공통 봉투: 데이터 + 응답 메타 + 사용자에게 보여줄 알림 문구.
export interface Result<A> {
  readonly data: A
  readonly meta: ResponseMeta
  readonly notices: ReadonlyArray<string>
}

// 캐시/티어 폴백 관련 공통 옵션.
export type CacheMode = "use" | "bypass" | "only"

export interface CommonOpts {
  readonly cache?: CacheMode
  readonly ttlSeconds?: number
}

export const defaultTtlSeconds = 21600

export const resolveCacheMode = (o: CommonOpts): CacheMode => o.cache ?? "use"

export const resolveTtlSeconds = (o: CommonOpts): number => o.ttlSeconds ?? defaultTtlSeconds

export const toResult = <A>(
  data: A,
  meta: ResponseMeta,
  notices: ReadonlyArray<string> = [],
): Result<A> => ({ data, meta, notices })
