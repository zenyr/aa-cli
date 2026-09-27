import type { CacheEntry, QuotaSnapshot } from "@aa/domain"
import { Cache, RateLimit, Tier } from "@aa/domain"
import { FileSystem, Path } from "@effect/platform"
import { Clock, type Context, Effect, Layer, Option, Schema } from "effect"
import { createHash } from "node:crypto"
import { resolveCacheDir } from "./resolve-cache-dir.ts"

// 파일에 저장되는 캐시 엔트리 형태.
const StoredEntry = Schema.Struct({
  key: Schema.String,
  storedAt: Schema.Number,
  expiresAt: Schema.Number,
  value: Schema.Unknown,
})

const QuotaFile = Schema.Struct({
  tier: Tier,
  rateLimit: RateLimit,
  observedAt: Schema.Number,
})

type CacheService = Context.Tag.Service<typeof Cache>

const sha256 = (input: string): string => createHash("sha256").update(input).digest("hex")

// 임시 파일에 쓴 뒤 rename 하여 원자적으로 저장한다.
const writeAtomic = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  filePath: string,
  content: string,
): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    yield* fs.makeDirectory(path.dirname(filePath), { recursive: true })
    const tmpPath = `${filePath}.${Math.random().toString(36).slice(2)}.tmp`
    yield* fs.writeFileString(tmpPath, content)
    yield* fs.rename(tmpPath, filePath)
  }).pipe(
    Effect.catchAll((error) => Effect.logDebug("cache write failed", error)),
    Effect.asVoid,
  )

const readJson = <A, I>(
  fs: FileSystem.FileSystem,
  filePath: string,
  schema: Schema.Schema<A, I>,
): Effect.Effect<Option.Option<A>, never> =>
  fs.readFileString(filePath).pipe(
    Effect.flatMap((content) => Schema.decodeUnknown(Schema.parseJson(schema))(content)),
    Effect.map(Option.some),
    Effect.catchAll((error) =>
      Effect.logDebug("cache read failed", error).pipe(Effect.as(Option.none())),
    ),
  )

// 드라이븐 어댑터: 파일시스템 기반 캐시. 에러는 모두 흡수하고 debug 로 로깅한다.
export const CacheFileLive = Layer.effect(
  Cache,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const dir = yield* resolveCacheDir
    const entryPath = (key: string) => path.join(dir, "http", `${sha256(key)}.json`)
    const quotaPath = path.join(dir, "quota.json")

    const get: CacheService["get"] = (key) =>
      Effect.gen(function* () {
        const stored = yield* readJson(fs, entryPath(key), StoredEntry)
        if (stored._tag === "None") return Option.none()
        const now = yield* Clock.currentTimeMillis
        if (stored.value.expiresAt <= now) return Option.none()
        const entry: CacheEntry = { value: stored.value.value, storedAt: stored.value.storedAt }
        return Option.some(entry)
      })

    const set: CacheService["set"] = (key, value, ttlSeconds) =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis
        const encoded = yield* Schema.encode(Schema.parseJson(StoredEntry))({
          key,
          storedAt: now,
          expiresAt: now + ttlSeconds * 1000,
          value,
        }).pipe(
          Effect.catchAll((error) =>
            Effect.logDebug("cache encode failed", error).pipe(Effect.as(null)),
          ),
        )
        if (encoded === null) return
        yield* writeAtomic(fs, path, entryPath(key), encoded)
      })

    const clear: CacheService["clear"] = () =>
      fs.remove(path.join(dir, "http"), { recursive: true }).pipe(
        Effect.catchAll((error) => Effect.logDebug("cache clear failed", error)),
        Effect.asVoid,
      )

    const getRateLimit: CacheService["getRateLimit"] = () => readJson(fs, quotaPath, QuotaFile)

    const clearRateLimit: CacheService["clearRateLimit"] = () =>
      fs.remove(quotaPath).pipe(
        Effect.catchAll((error) => Effect.logDebug("quota clear failed", error)),
        Effect.asVoid,
      )

    const setRateLimit: CacheService["setRateLimit"] = (snapshot: QuotaSnapshot) =>
      Effect.gen(function* () {
        const encoded = yield* Schema.encode(Schema.parseJson(QuotaFile))(snapshot).pipe(
          Effect.catchAll((error) =>
            Effect.logDebug("quota encode failed", error).pipe(Effect.as(null)),
          ),
        )
        if (encoded === null) return
        yield* writeAtomic(fs, path, quotaPath, encoded)
      })

    return Cache.of({ get, set, clear, getRateLimit, setRateLimit, clearRateLimit })
  }),
)
