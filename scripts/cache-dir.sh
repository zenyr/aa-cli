#!/usr/bin/env sh
# 워크트리와 무관하게 같은 개발용 캐시 디렉터리를 출력한다.
# 모든 워크트리가 공유하는 git common dir(= 메인 워크트리의 .git) 아래에 둔다.
set -eu
if [ -n "${AA_CACHE_DIR:-}" ]; then
  dir="$AA_CACHE_DIR"
else
  common="$(git -C "$(dirname "$0")" rev-parse --path-format=absolute --git-common-dir)"
  dir="$common/aa-cache"
fi
mkdir -p "$dir"
printf '%s\n' "$dir"
