import { join } from "node:path"

export type EnvLookup = Readonly<Record<string, string | undefined>>

// 설정 파일 경로를 결정한다: AA_CONFIG_FILE -> $XDG_CONFIG_HOME/aa-cli/.env -> $HOME/.config/aa-cli/.env.
export const resolveConfigFilePath = (env: EnvLookup): string | undefined => {
  const explicit = env["AA_CONFIG_FILE"]
  if (explicit !== undefined && explicit !== "") return explicit

  const xdgConfigHome = env["XDG_CONFIG_HOME"]
  if (xdgConfigHome !== undefined && xdgConfigHome !== "")
    return join(xdgConfigHome, "aa-cli", ".env")

  const home = env["HOME"]
  if (home !== undefined && home !== "") return join(home, ".config", "aa-cli", ".env")

  return undefined
}
