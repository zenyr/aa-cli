// `aa endpoints` 용 지원 엔드포인트 카탈로그. SUMMARY.md 엔드포인트 표를 그대로 옮긴다.
export interface EndpointInfo {
  readonly method: "GET" | "POST"
  readonly path: string
  readonly tier: "free" | "pro" | "commercial"
  readonly command: string
  readonly summary: string
}

export const endpoints: ReadonlyArray<EndpointInfo> = [
  {
    method: "GET",
    path: "/language/models/free",
    tier: "free",
    command: "models --free",
    summary: "free-tier 언어 모델 목록",
  },
  {
    method: "GET",
    path: "/language/models",
    tier: "pro",
    command: "models",
    summary: "언어 모델 전체 목록 (모든 필드)",
  },
  {
    method: "GET",
    path: "/language/models/{slug}",
    tier: "pro",
    command: "model <slug>",
    summary: "언어 모델 단건 조회",
  },
  {
    method: "GET",
    path: "/language/models/{slug}/performance",
    tier: "commercial",
    command: "model <slug> perf",
    summary: "언어 모델 성능 추이",
  },
  {
    method: "GET",
    path: "/language/providers",
    tier: "commercial",
    command: "providers",
    summary: "언어 모델 provider 목록",
  },
  {
    method: "GET",
    path: "/language/providers/{slug}",
    tier: "commercial",
    command: "providers <slug>",
    summary: "provider 단건 조회",
  },
  {
    method: "GET",
    path: "/language/providers/{slug}/performance",
    tier: "commercial",
    command: "providers <slug> perf",
    summary: "provider 성능 추이",
  },
  {
    method: "GET",
    path: "/language/providers/{slug}/measurements",
    tier: "commercial",
    command: "providers <slug> measurements",
    summary: "provider 원본 측정치 (계정별 승인 필요)",
  },
  {
    method: "GET",
    path: "/media/text-to-image/models",
    tier: "pro",
    command: "media text-to-image",
    summary: "text-to-image 아레나 모델 목록",
  },
  {
    method: "GET",
    path: "/media/image-editing/models",
    tier: "pro",
    command: "media image-editing",
    summary: "image-editing 아레나 모델 목록",
  },
  {
    method: "GET",
    path: "/media/text-to-video/models",
    tier: "pro",
    command: "media text-to-video",
    summary: "text-to-video 아레나 모델 목록",
  },
  {
    method: "GET",
    path: "/media/image-to-video/models",
    tier: "pro",
    command: "media image-to-video",
    summary: "image-to-video 아레나 모델 목록",
  },
  {
    method: "GET",
    path: "/media/text-to-video-audio/models",
    tier: "pro",
    command: "media text-to-video-audio",
    summary: "text-to-video-audio 아레나 모델 목록",
  },
  {
    method: "GET",
    path: "/media/image-to-video-audio/models",
    tier: "pro",
    command: "media image-to-video-audio",
    summary: "image-to-video-audio 아레나 모델 목록",
  },
  {
    method: "GET",
    path: "/media/text-to-speech/models",
    tier: "pro",
    command: "media text-to-speech",
    summary: "text-to-speech 아레나 모델 목록",
  },
  {
    method: "GET",
    path: "/media/speech-to-speech/models",
    tier: "pro",
    command: "media speech-to-speech",
    summary: "speech-to-speech 아레나 모델 목록",
  },
  {
    method: "GET",
    path: "/media/speech-to-text/models",
    tier: "pro",
    command: "media speech-to-text",
    summary: "speech-to-text 아레나 모델 목록",
  },
  {
    method: "GET",
    path: "/media/music/instrumental/models",
    tier: "pro",
    command: "media music-instrumental",
    summary: "music-instrumental 아레나 모델 목록",
  },
  {
    method: "GET",
    path: "/media/music/with-vocals/models",
    tier: "pro",
    command: "media music-vocal",
    summary: "music-vocal 아레나 모델 목록",
  },
]
