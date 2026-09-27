# AGENTS.md

이 저장소에서 작업하는 에이전트가 지켜야 할 원칙. 프로젝트 개요·구조·설계 상세는 `README.md`, 할 일은 `todo.md`, API 레퍼런스는 `refs/artificialanalysis/SUMMARY.md` 를 본다.

## 보안 (절대)

- `.env` 는 읽지도, 출력하지도, 커밋하지도 않는다. 필요한 키 이름(`AA_APIKEY`)은 `.env.example` 에서 확인한다.
- 키 값은 로그, 에러, 스냅샷, 테스트 픽스처, 커밋 어디에도 남기지 않는다. `x-api-key` 헤더는 항상 가린다.
- 키는 `Config.redacted("AA_APIKEY")` 로만 읽는다.
- 실제 API 호출은 하루 한도(free 100회)를 소모한다. 필요할 때만, `AA_LIVE=1` 로 명시할 때만 호출한다.

## 워크트리

- 세션의 작업 디렉터리가 메인 워크트리가 아닐 수 있다. 경로를 가정하지 말고 저장소 루트는 `git rev-parse --show-toplevel` 로 구한다.
- 캐시 같은 워크트리 간 공유 상태는 워크트리 안에 두지 않는다.
  - 개발 캐시는 `scripts/cache-dir.sh` 가 반환하는 경로(`AA_CACHE_DIR`)만 쓴다.
  - 새 캐시 경로를 하드코딩하지 않는다.
- 워크트리의 `.env` 는 메인 워크트리 `.env` 로의 심볼릭 링크다 (`scripts/init-worktree.sh` 가 만든다).
  - 링크가 없으면 `bash scripts/init-worktree.sh` 를 실행한다.
  - 복사하거나 내용을 읽지 않는다.

## 아키텍처

- 헥사고널 구조를 지킨다. 의존 방향은 `adapter-* → application → domain` 이다. 역방향 import 는 금지한다.
- `domain` 은 `effect` 외 의존성을 두지 않는다.
- 어댑터에는 포트 구현만 둔다. 비즈니스 로직은 `application` 에 둔다.
- 조립(Layer 합성)은 `apps/cli` 에서만 한다.
- 배포물은 `@zenyr/aa-cli` 하나다. `@aa/*` 는 private 로 두고 배포하지 않는다.

## CLI 동작 원칙

- stdout 에는 데이터만 쓴다. 진단, 경고, 힌트는 stderr 에 쓴다.
- 비대화형이어야 한다. 프롬프트와 스피너를 쓰지 않는다. TTY 가 아니거나 `NO_COLOR` 가 있으면 색을 끈다.
- JSON 출력은 안정적이어야 한다. AA 원본 snake_case 필드명을 유지하고, 키 순서를 고정하고, `null` 을 0 으로 바꾸지 않는다.
- 종료 코드는 `README.md` 에 정의한 표를 따른다. 임의로 새 코드를 만들지 않는다.
- 출력에 Artificial Analysis 출처 표기를 빼지 않는다.

## 코드 규칙

- 런타임, 패키지 관리, 테스트 모두 Bun 을 쓴다. npm, pnpm, yarn 은 쓰지 않는다.
- Lint 는 oxlint, 포맷은 oxfmt 를 쓴다. ESLint, Prettier 를 들이지 않는다.
- Effect 스타일을 따른다.
  - `Effect.gen`, `Context.Tag` + `Layer` 로 작성한다.
  - 에러는 TaggedError 로 만든다.
  - `async/await`, `throw`, `try/catch` 는 어댑터 경계에서만 쓴다.
  - `any` 는 금지한다.
- AA 응답은 `Schema` 로 디코드한다. 모르는 필드는 허용하고, 필수 필드만 엄격하게 검사한다.
- 테스트는 인메모리 Layer 와 `refs/` 기반 픽스처로 작성한다.

## 커밋

- Conventional Commits 를 따른다. lefthook `commit-msg` 가 강제한다. 스코프는 패키지명으로 쓴다. 예: `feat(cli): add --fields projection`.
- 커밋 전에 `bun run lint`, `bun run typecheck`, `bun run test` 가 통과해야 한다. 훅을 우회(`--no-verify`)하지 않는다.
- `todo.md` 항목을 끝내면 체크하고 같은 커밋에 포함한다.
