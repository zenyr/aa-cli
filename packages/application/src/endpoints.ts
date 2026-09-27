// `aa-cli endpoints` 용 지원 엔드포인트 카탈로그. SUMMARY.md 엔드포인트 표를 그대로 옮긴다.
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
    command: "list --free",
    summary: "Free-tier language model list",
  },
  {
    method: "GET",
    path: "/language/models",
    tier: "pro",
    command: "list",
    summary: "Full language model list (all fields)",
  },
  {
    method: "GET",
    path: "/language/models/{slug}",
    tier: "pro",
    command: "show <slug>",
    summary: "Single language model lookup",
  },
  {
    method: "GET",
    path: "/language/models/{slug}/performance",
    tier: "commercial",
    command: "perf <slug>",
    summary: "Language model performance history",
  },
  {
    method: "GET",
    path: "/language/providers",
    tier: "commercial",
    command: "providers list",
    summary: "Language model provider list",
  },
  {
    method: "GET",
    path: "/language/providers/{slug}",
    tier: "commercial",
    command: "providers show <slug>",
    summary: "Single provider lookup",
  },
  {
    method: "GET",
    path: "/language/providers/{slug}/performance",
    tier: "commercial",
    command: "providers perf <slug>",
    summary: "Provider performance history",
  },
  {
    method: "GET",
    path: "/language/providers/{slug}/measurements",
    tier: "commercial",
    command: "providers measurements <slug>",
    summary: "Raw provider measurements (requires per-account approval)",
  },
  {
    method: "GET",
    path: "/media/text-to-image/models",
    tier: "pro",
    command: "media text-to-image",
    summary: "text-to-image arena model list",
  },
  {
    method: "GET",
    path: "/media/image-editing/models",
    tier: "pro",
    command: "media image-editing",
    summary: "image-editing arena model list",
  },
  {
    method: "GET",
    path: "/media/text-to-video/models",
    tier: "pro",
    command: "media text-to-video",
    summary: "text-to-video arena model list",
  },
  {
    method: "GET",
    path: "/media/image-to-video/models",
    tier: "pro",
    command: "media image-to-video",
    summary: "image-to-video arena model list",
  },
  {
    method: "GET",
    path: "/media/text-to-video-audio/models",
    tier: "pro",
    command: "media text-to-video-audio",
    summary: "text-to-video-audio arena model list",
  },
  {
    method: "GET",
    path: "/media/image-to-video-audio/models",
    tier: "pro",
    command: "media image-to-video-audio",
    summary: "image-to-video-audio arena model list",
  },
  {
    method: "GET",
    path: "/media/text-to-speech/models",
    tier: "pro",
    command: "media text-to-speech",
    summary: "text-to-speech arena model list",
  },
  {
    method: "GET",
    path: "/media/speech-to-speech/models",
    tier: "pro",
    command: "media speech-to-speech",
    summary: "speech-to-speech arena model list",
  },
  {
    method: "GET",
    path: "/media/speech-to-text/models",
    tier: "pro",
    command: "media speech-to-text",
    summary: "speech-to-text arena model list",
  },
  {
    method: "GET",
    path: "/media/music/instrumental/models",
    tier: "pro",
    command: "media music-instrumental",
    summary: "music-instrumental arena model list",
  },
  {
    method: "GET",
    path: "/media/music/with-vocals/models",
    tier: "pro",
    command: "media music-vocal",
    summary: "music-vocal arena model list",
  },
]
