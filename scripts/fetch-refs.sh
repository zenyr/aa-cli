#!/usr/bin/env bash
# AA 원문 레퍼런스(재배포 불가)를 로컬에 받는다. git 에는 올리지 않는다.
set -euo pipefail
dir="$(git rev-parse --show-toplevel)/refs/artificialanalysis"
mkdir -p "$dir"
curl -fsSL https://artificialanalysis.ai/api/v2/openapi -o "$dir/openapi.yaml"
curl -fsSL https://artificialanalysis.ai/data-api/docs \
  | bun -e 'const s = await Bun.stdin.text(); console.log(s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, "\n").replace(/\n\s*\n+/g, "\n"))' \
  > "$dir/docs.txt"
echo "fetch-refs: $dir 갱신" >&2
