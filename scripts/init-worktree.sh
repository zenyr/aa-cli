#!/usr/bin/env bash
# 워크트리 최초 실행 시 개발툴이 호출한다: bash scripts/init-worktree.sh
# 1) 메인 워크트리의 .env 를 심볼릭 링크로 연결한다 (내용은 읽지 않는다).
# 2) 의존성을 설치한다 (lefthook 훅 설치 포함).
# 여러 번 실행해도 안전하다.
set -euo pipefail

here="$(git rev-parse --show-toplevel)"
common="$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)"
main="$(dirname "$common")"

link_env() {
  local src="$main/.env" dst="$here/.env"
  [ "$here" = "$main" ] && return 0
  if [ ! -e "$src" ]; then
    echo "init-worktree: $src 가 없음. 메인 워크트리에 .env 를 먼저 만드세요 (.env.example 참고)" >&2
    return 0
  fi
  if [ -L "$dst" ]; then
    [ "$(readlink "$dst")" = "$src" ] && return 0
    ln -sfn "$src" "$dst"
  elif [ -e "$dst" ]; then
    echo "init-worktree: $dst 가 일반 파일로 이미 있어서 건드리지 않음" >&2
    return 0
  else
    ln -s "$src" "$dst"
  fi
  echo "init-worktree: .env -> $src" >&2
}

link_env
(cd "$here" && bun install --frozen-lockfile >&2)
