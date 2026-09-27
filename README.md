# aa

[Artificial Analysis Data API](https://artificialanalysis.ai/data-api/docs) 용 CLI. 셸로 작업하는 AI 에이전트가 쓰기 좋게 만드는 것이 1차 목표이고, 사람은 그다음이다.

- 패키지: `@zenyr/aa-cli`
- 실행 명령: `aa-cli`
- 스택: Bun · Effect.ts · Turborepo · oxlint · oxfmt · lefthook

> 데이터 출처: [Artificial Analysis](https://artificialanalysis.ai/)

## 설정

```sh
cp .env.example .env   # AA_APIKEY 채우기
bun install
```

API 키는 다음 순서로 찾는다. 위에서 먼저 걸리는 값을 쓴다.

1. `AA_APIKEY` 환경변수
2. `$AA_CONFIG_FILE` (경로를 직접 지정)
3. `$XDG_CONFIG_HOME/aa-cli/.env` → `~/.config/aa-cli/.env`

전역으로 링크된 `aa-cli` 는 실행 디렉터리의 `.env` 를 읽지 않으므로(Bun 이 CWD 의 `.env` 만 자동 로드), 저장소 밖에서 쓰려면 설정 파일을 둔다.

```sh
mkdir -p ~/.config/aa-cli
printf 'AA_APIKEY=...\n' > ~/.config/aa-cli/.env
chmod 600 ~/.config/aa-cli/.env
```

파일이 그룹/전체에 읽기 권한이 열려 있으면(`chmod 600` 이 아니면) 실행 시 stderr 에 경고만 출력하고 계속 진행한다(값은 출력하지 않는다).

## 모노레포 구조 (헥사고널)

```
apps/
  cli/                 @zenyr/aa-cli        유일한 배포물. bin "aa-cli". 조립(composition root)
packages/
  domain/              @aa/domain           순수 모델 + 포트 + 에러
  application/         @aa/application      유스케이스
  adapter-aa-http/     @aa/adapter-aa-http  드라이븐: AA API HTTP 클라이언트 (@effect/platform)
  adapter-cache/       @aa/adapter-cache    드라이븐: 파일 캐시 (아래 "캐시 위치")
  adapter-cli/         @aa/adapter-cli      드라이빙: @effect/cli 커맨드 + 출력 포매터
  tsconfig/            @aa/tsconfig         공유 tsconfig
refs/                  외부 자료 스냅샷 (읽기 전용)
```

```
adapter-cli ─┐
             ├─▶ application ─▶ domain
adapter-*  ──┘
apps/cli ── 모든 레이어를 Layer 로 조립
```

| 레이어      | 담는 것                                                                                                                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain      | `Schema` 엔티티 (LanguageModel, Provider, MediaModel, Envelope, Pagination, Tier, RateLimit)<br>태그드 에러 (`AuthError`, `TierError`, `NotFound`, `RateLimited`, `BadRequest`, `ServerError`)<br>포트 (`AaApi`, `Cache`, `Clock`) |
| application | models, model, compare, rank, media 유스케이스<br>페이지 전체 수집, 티어 폴백 (pro 403 → `/free`), 필드 선택·정렬·필터                                                                                                             |
| adapters    | 포트 구현만                                                                                                                                                                                                                        |
| apps/cli    | `main.ts` 에서 Layer 조립 + `BunRuntime.runMain`, `bun build --compile`                                                                                                                                                            |

## 커맨드 (초안)

```
aa-cli find <words...>                                           # 이름/키워드로 언어 모델 검색
aa-cli show <query> [--prompt-type ...]                          # 언어 모델 단건 조회
aa-cli perf <query> [--window 90d] [--interval weekly]           # commercial, 성능 추이
aa-cli compare <slug> <slug>...                                  # 주요 지표 나란히
aa-cli list [--free] [--prompt-type long] [--all-pages] [--sort -intelligence] [--fields ...]
aa-cli providers list|show|perf|measurements <slug>              # commercial
aa-cli media <kind> [--free] [--categories|--genres]             # kind: text-to-image, ...
aa-cli quota                                                     # 캐시된 사용량 한도 상태 (요청 소모 없음)
aa-cli endpoints                                                 # 지원 엔드포인트와 필요 티어
aa-cli schema <command...>                                       # 출력 JSON Schema
aa-cli raw <path> [--query k=v]                                  # 탈출구: 임의 GET
```

공통 옵션:

| 옵션                                   | 설명                                    |
| -------------------------------------- | --------------------------------------- |
| `--format json\|jsonl\|table\|tsv\|md` | TTY 면 `table`, 파이프면 `json` 이 기본 |
| `--json`                               | `--format json` 별칭                    |
| `--fields a,b.c`                       | 필드 프로젝션                           |
| `--limit`, `--sort`, `--filter`        | 결과 줄이기                             |
| `--full`                               | 요약 대신 전체 필드                     |
| `--no-cache`, `--offline`              | 캐시 제어                               |

## 출력 계약

성공 (JSON):

```jsonc
{
  "data": [ ... ],
  "meta": {
    "tier": "free",
    "rate_limit": { "limit": 100, "remaining": 87, "reset": 1790000000 },
    "source": "https://artificialanalysis.ai/api/v2/language/models/free",
    "cached": false,
    "attribution": "Data: Artificial Analysis (https://artificialanalysis.ai)"
  }
}
```

에러 (stderr, JSON 모드):

```json
{ "error": { "code": "tier", "message": "...", "hint": "try --free", "status": 403 } }
```

table 출력일 때는 마지막 줄(stderr)에 `Data: Artificial Analysis` 를 붙인다.

### 종료 코드

| code | 의미                  |
| ---- | --------------------- |
| 0    | 성공                  |
| 1    | 알 수 없는 오류 / 5xx |
| 2    | 사용법 오류 / 400     |
| 3    | 인증 (401, 키 없음)   |
| 4    | 티어 부족 (403)       |
| 5    | not found (404)       |
| 6    | 한도 초과 (429)       |

## 워크트리

새 워크트리를 처음 열 때 개발툴이 `bash scripts/init-worktree.sh` 를 실행한다. 이 스크립트는 두 가지를 한다.

1. 메인 워크트리의 `.env` 를 현재 워크트리에 심볼릭 링크로 연결한다.
2. `bun install --frozen-lockfile` 로 의존성을 설치한다 (lefthook 훅 설치 포함).

- 여러 번 실행해도 안전하다.
- 메인 워크트리에서 실행하면 아무것도 하지 않는다.
- 이미 일반 파일 `.env` 가 있으면 덮어쓰지 않는다.

## 캐시 위치

위에서부터 먼저 걸리는 경로를 쓴다.

1. `AA_CACHE_DIR` 환경변수
2. `$XDG_CACHE_HOME/aa-cli`
3. `~/.cache/aa-cli`

배포된 CLI는 사용자 전역 경로를 쓰므로 현재 디렉터리와 무관하다.

개발 중에는 `AA_CACHE_DIR` 로 **워크트리와 무관한 공유 캐시**를 쓴다. Claude Code, Codex, OpenCode 세션이 메인이 아닌 워크트리에서 열리더라도 캐시를 공유해서 API 한도를 중복으로 쓰지 않게 하려는 것이다.

```sh
scripts/cache-dir.sh   # → <메인 워크트리>/.git/aa-cache
```

- git common dir(모든 워크트리가 공유하는 `.git`) 아래에 두므로 어느 워크트리에서 실행해도 같은 경로가 나온다.
- 이 경로는 git 이 추적하지 않는다.
- 저장소 스크립트(`bun run dev`, 라이브 테스트 등)는 이 값을 `AA_CACHE_DIR` 로 주입한다.
- 캐시를 비우려면: `rm -rf "$(scripts/cache-dir.sh)"`

애플리케이션은 마지막으로 관측된 티어("free")를 기억해 pro 전용 엔드포인트 호출을 건너뛴다.

- 이 기억은 다음 실제 요청의 응답 티어로 자동 회복된다. 단, 캐시된 응답이 있으면 TTL 만큼 지연될 수 있다.
- `aa-cli cache clear --quota`: 기억된 티어/사용량만 즉시 지운다. 다음 요청에서 바로 재감지한다.
- `aa-cli cache clear`: 응답 캐시와 티어 기억을 모두 지운다.

## 개발

```sh
bun run check                                   # fmt:check + lint + typecheck + test
bun run build | typecheck | test                # turbo run <task>
bun run lint | fmt                              # oxlint / oxfmt (루트에서 한 번에)
bun run --cwd apps/cli dev -- <args>            # aa-cli 실행 (AA_CACHE_DIR 자동 주입)
AA_LIVE=1 bun run test                          # 실제 API 호출 테스트 (한도 소모)
```

- lefthook `pre-commit`: staged 파일에 oxfmt, oxlint
- lefthook `commit-msg`: Conventional Commits 검사 (commitlint, 스코프 목록은 `commitlint.config.ts`)
- lefthook `pre-push`: typecheck, test

## 참고

- `refs/artificialanalysis/SUMMARY.md`: API 요약 (엔드포인트, 티어, 사용량 한도, 에러)
- `refs/artificialanalysis/openapi.yaml`: 원본 OpenAPI 스펙
