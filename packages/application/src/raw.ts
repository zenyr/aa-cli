import { AaApi, Cache } from "@aa/domain"
import type { AaError } from "@aa/domain"
import { Effect, Schema } from "effect"
import { cachedGet } from "./cached.ts"
import { resolveCacheMode, resolveTtlSeconds, toResult } from "./result.ts"
import type { CommonOpts, Result } from "./result.ts"

// 탈출구: 임의 GET. 응답 스키마를 강제하지 않는다.
export const rawGet = (
  path: string,
  query: Record<string, string>,
  o: CommonOpts,
): Effect.Effect<Result<unknown>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const cacheMode = resolveCacheMode(o)
    const ttlSeconds = resolveTtlSeconds(o)
    const r = yield* cachedGet({ path, query, schema: Schema.Unknown, cacheMode, ttlSeconds })
    return toResult(r.body, r.meta)
  })
