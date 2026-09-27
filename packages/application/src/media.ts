import { AaApi, Cache, ListEnvelope, MediaKind, MediaModel, mediaKindPath } from "@aa/domain"
import type { AaError } from "@aa/domain"
import { Effect, Either } from "effect"
import { cachedGet } from "./cached.ts"
import { resolveCacheMode, resolveTtlSeconds, toResult } from "./result.ts"
import type { CommonOpts, Result } from "./result.ts"

export interface ListMediaOpts extends CommonOpts {
  readonly free?: boolean
  readonly categories?: boolean
  readonly genres?: boolean
}

// pro 경로가 TierError 로 실패하면 `<path>/free` 로 재시도하고 알림을 남긴다.
export const listMedia = (
  kind: MediaKind,
  o: ListMediaOpts,
): Effect.Effect<Result<ReadonlyArray<MediaModel>>, AaError, AaApi | Cache> =>
  Effect.gen(function* () {
    const cacheMode = resolveCacheMode(o)
    const ttlSeconds = resolveTtlSeconds(o)
    const schema = ListEnvelope(MediaModel)
    const basePath = mediaKindPath[kind]

    const query: Record<string, string> = {}
    if (o.categories === true) query.include_categories = "true"
    if (o.genres === true) query.include_genres = "true"

    const attempt = (path: string) => cachedGet({ path, query, schema, cacheMode, ttlSeconds })

    if (o.free === true) {
      const r = yield* attempt(`${basePath}/free`)
      return toResult(r.body.data, r.meta)
    }

    const primary = yield* Effect.either(attempt(basePath))
    if (Either.isRight(primary)) return toResult(primary.right.body.data, primary.right.meta)
    if (primary.left._tag !== "TierError") return yield* Effect.fail(primary.left)

    const fallback = yield* attempt(`${basePath}/free`)
    return toResult(fallback.body.data, fallback.meta, [
      `tier ${fallback.meta.tier ?? "free"} lacks ${basePath}; fell back to ${basePath}/free (fewer fields)`,
    ])
  })
