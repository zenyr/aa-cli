// 조립 루트 헬퍼: 환경변수를 우선하고, 없으면 XDG 설정 파일(`~/.config/aa-cli/.env`)로 폴백하는 ConfigProvider 를 만든다.
// 어댑터는 이 모듈을 몰라야 하므로 apps/cli 안에만 둔다.
import { ConfigProvider } from "effect"
import { readFileSync, statSync } from "node:fs"
import { parseDotenv } from "./dotenv-parser.ts"
import { resolveConfigFilePath, type EnvLookup } from "./config-file-path.ts"

const isReadableByOthers = (mode: number): boolean => (mode & 0o077) !== 0

const debugLog = (env: EnvLookup, message: string): void => {
  if (env["AA_DEBUG"] !== undefined) console.error(`aa-cli: debug: ${message}`)
}

const warnPermissive = (path: string): void => {
  console.error(`aa-cli: warning: ${path} is readable by others; chmod 600 recommended`)
}

// 설정 파일을 읽어 Map 으로 반환한다. 없거나 읽을 수 없으면 빈 Map (디버그 로그만 남긴다).
const readConfigFileMap = (env: EnvLookup): Map<string, string> => {
  const path = resolveConfigFilePath(env)
  if (path === undefined) return new Map()

  try {
    const stat = statSync(path)
    if (isReadableByOthers(stat.mode)) warnPermissive(path)

    const content = readFileSync(path, "utf8")
    return parseDotenv(content)
  } catch (cause) {
    debugLog(env, `config file at ${path} not readable: ${String(cause)}`)
    return new Map()
  }
}

export type BuildConfigProviderOptions = {
  // 설정 파일 경로 탐색과 권한 경고에 쓰는 환경변수 조회. 기본값은 실제 `process.env`.
  readonly env?: EnvLookup
  // 1순위로 조회할 ConfigProvider. 기본값은 실제 환경변수(`ConfigProvider.fromEnv()`).
  // 테스트에서는 `ConfigProvider.fromMap(...)` 으로 환경변수를 흉내낼 때 이 옵션을 쓴다.
  readonly envProvider?: ConfigProvider.ConfigProvider
}

// 환경변수를 우선하고, 없으면 설정 파일 값으로 폴백하는 ConfigProvider.
export const buildConfigProvider = (
  options: BuildConfigProviderOptions = {},
): ConfigProvider.ConfigProvider => {
  const env = options.env ?? process.env
  const envProvider = options.envProvider ?? ConfigProvider.fromEnv()
  return envProvider.pipe(
    ConfigProvider.orElse(() => ConfigProvider.fromMap(readConfigFileMap(env))),
  )
}
