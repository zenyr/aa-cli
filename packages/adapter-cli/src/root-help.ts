// `aa-cli`, `aa-cli --help`, `aa-cli -h` 가 보여주는, 손으로 쓴 짧은 도움말.
// @effect/cli 기본 렌더링은 옵션이 많아지면 장황해져서, Commands 섹션은 `help-spec.ts` 의
// `rootMenu` 에서 생성하고, 나머지 정적 텍스트만 여기서 손으로 유지한다.
import { rootMenu } from "./help-spec.ts"

const commandsSection = (): ReadonlyArray<string> => {
  const width = Math.max(...rootMenu.map((e) => e.label.length))
  return rootMenu.map((e) => `  ${e.label.padEnd(width)}   ${e.summary}`)
}

export const rootHelpText = [
  "aa-cli — Artificial Analysis Data API for agents and humans",
  "",
  "Usage: aa-cli <command> [args] [options]",
  "",
  "Commands:",
  ...commandsSection(),
  "",
  "Common options:",
  "  --format json|jsonl|table|tsv|md   default: table on TTY, json when piped",
  "  --fields a,b.c    project fields        --full    all fields",
  "  --sort -field     sort (desc with -)    --limit N",
  "  --filter expr     field=v, >, >=, <, <=, !=, ~ (contains); repeatable",
  "  --offline         cache only            --no-cache  force refresh",
  "",
  "Examples:",
  "  aa-cli find opus 5.5",
  '  aa-cli compare "opus 5.5" "opus 5" --fields slug,evaluations.artificial_analysis_intelligence_index',
  "  aa-cli list --sort -evaluations.artificial_analysis_intelligence_index --limit 10",
  "",
  "Exit codes: 0 ok, 2 usage/ambiguous, 3 auth, 4 tier, 5 not found, 6 rate limited",
  "Config: AA_APIKEY env or ~/.config/aa-cli/.env · Data: Artificial Analysis",
].join("\n")
