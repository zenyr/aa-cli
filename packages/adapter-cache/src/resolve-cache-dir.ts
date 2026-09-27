import { Path } from "@effect/platform"
import { Config, Effect, Option } from "effect"
import { tmpdir } from "node:os"

// 실패 없이 환경 변수 하나를 Option 으로 읽는다.
const readEnv = (name: string): Effect.Effect<Option.Option<string>> =>
  Config.string(name).pipe(Config.option, Effect.orDie)

// 캐시 디렉터리 경로를 결정한다: AA_CACHE_DIR -> $XDG_CACHE_HOME/aa -> $HOME/.cache/aa -> os tmpdir/aa.
export const resolveCacheDir: Effect.Effect<string, never, Path.Path> = Effect.gen(function* () {
  const path = yield* Path.Path

  const aaCacheDir = yield* readEnv("AA_CACHE_DIR")
  if (aaCacheDir._tag === "Some") return aaCacheDir.value

  const xdgCacheHome = yield* readEnv("XDG_CACHE_HOME")
  if (xdgCacheHome._tag === "Some") return path.join(xdgCacheHome.value, "aa")

  const home = yield* readEnv("HOME")
  if (home._tag === "Some") return path.join(home.value, ".cache", "aa")

  return path.join(tmpdir(), "aa")
})
