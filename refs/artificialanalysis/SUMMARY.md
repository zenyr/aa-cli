# Artificial Analysis Data API v2 — 요약

- Base URL: `https://artificialanalysis.ai/api/v2`
- 인증: 헤더 `x-api-key: <key>` 하나뿐 (OAuth/서명 없음). 로컬에선 `.env` 의 `AA_APIKEY`.
- 스펙: `openapi.yaml` (OpenAPI 3.1, Zod contract 에서 생성됨 → 스키마 신뢰도 높음)
- **Attribution 필수**: 데이터를 표시/공유할 때 "Artificial Analysis" 출처 표기.

## 응답 envelope

```jsonc
{
  "tier": "free" | "pro" | "commercial",
  "intelligence_index_version": 4.1,        // language 계열
  "pagination": { "page", "page_size", "total_pages", "has_more" }, // 리스트 엔드포인트
  "data": [ ... ] | { ... }
}
```

에러: `{ "error": string, "details"?: object }`

| status | 의미 | CLI 처리 |
| --- | --- | --- |
| 400 | 잘못된 query (필드명 포함) | 사용자 입력 오류 |
| 401 | 키 없음/무효 | 인증 오류 |
| 403 | 티어 미지원 / 승인 필요(CritPt) | 티어 오류 → `/free` 대체 힌트 |
| 404 | slug 없음 | not found |
| 429 | 일일 한도 소진, `Retry-After` 포함 | 재시도 금지, 리셋 시각 안내 |
| 500 | 서버 오류 | 지수 백오프 재시도 |

## 응답 헤더

`X-AA-Tier`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`(unix ts), `Retry-After`(429).

## 티어 & 레이트리밋

- 고정 24시간 윈도우 (롤링 아님). 윈도우 만료 후 첫 요청 시점부터 새 24h.
- Free 100 / Pro 500 / Commercial custom — **요청 수가 매우 귀함 → CLI 캐시 필수**.
- Free: `/language/models/free` + `*/free` 미디어만. Pro: 모델 레벨 전부. Commercial: provider/performance-over-time/measurements.

## 컨벤션

- 날짜 ISO 8601, 국가코드 소문자 alpha-2, 필드 snake_case (rename 없이 deprecate).
- `null` = 미측정/해당없음 (0 아님).
- E2E 응답시간은 500 answer tokens 가정.
- Intelligence Index 현재 v4.3.2 (응답엔 major.minor 만).

## 엔드포인트

공통 파라미터: `page`(int 1..10000, default 1), `prompt_type`(`medium|long|100k|vision_single_image|medium_coding|medium_parallel`, default `long`), `window`(`7d|30d|90d`, default `90d`), `interval`(`daily|weekly|monthly`), `include_categories`(bool), `include_genres`(bool).

### Language

| Method | Path | Params | Tier |
| --- | --- | --- | --- |
| GET | `/language/models/free` | page | free+ |
| GET | `/language/models` | prompt_type, page | pro+ |
| GET | `/language/models/{slug}` | prompt_type | pro+ (providers 는 commercial) |
| GET | `/language/models/{slug}/performance` | window, interval, prompt_type | commercial |
| GET | `/language/providers` | page | commercial |
| GET | `/language/providers/{slug}` | prompt_type | commercial |
| GET | `/language/providers/{slug}/performance` | window, interval, prompt_type | commercial |
| GET | `/language/providers/{slug}/measurements` | prompt_type, start_date | commercial(승인) |

### Media (각각 `/free` 변형 존재, free 는 파라미터 없음)

| kind | Path | Pro params |
| --- | --- | --- |
| text-to-image | `/media/text-to-image/models` | include_categories |
| image-editing | `/media/image-editing/models` | include_categories |
| text-to-video | `/media/text-to-video/models` | include_categories |
| image-to-video | `/media/image-to-video/models` | include_categories |
| text-to-video-audio | `/media/text-to-video-audio/models` | include_categories |
| image-to-video-audio | `/media/image-to-video-audio/models` | include_categories |
| text-to-speech | `/media/text-to-speech/models` | — |
| speech-to-speech | `/media/speech-to-speech/models` | — |
| speech-to-text | `/media/speech-to-text/models` | — |
| music-instrumental | `/media/music/instrumental/models` | include_genres |
| music-vocal | `/media/music/with-vocals/models` | include_genres |

### CritPt

| POST | `/critpt/evaluate` | 코드 제출 평가, 계정별 승인 필요 (critpt@artificialanalysis.ai) |
