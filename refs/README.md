# refs/

외부 자료 스냅샷. 코드에서 import 하지 않는 **읽기 전용 참고용**. 갱신 시 날짜를 남긴다.

| 경로 | 내용 | 원본 | 수집일 |
| --- | --- | --- | --- |
| `artificialanalysis/openapi.yaml` | AA Data API v2 OpenAPI 3.1 스펙 (원본 그대로) | https://artificialanalysis.ai/api/v2/openapi | 2026-09-27 |
| `artificialanalysis/docs.txt` | 문서 페이지 텍스트 추출본 | https://artificialanalysis.ai/data-api/docs | 2026-09-27 |
| `artificialanalysis/SUMMARY.md` | 위 두 자료의 요약 (CLI 설계 관점) | — | 2026-09-27 |

갱신:

```sh
curl -sL https://artificialanalysis.ai/api/v2/openapi -o refs/artificialanalysis/openapi.yaml
```
