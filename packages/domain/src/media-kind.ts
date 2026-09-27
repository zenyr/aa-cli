import { Schema } from "effect"

// 11개 미디어 아레나 종류 (SUMMARY.md 참고).
export const MediaKind = Schema.Literal(
  "text-to-image",
  "image-editing",
  "text-to-video",
  "image-to-video",
  "text-to-video-audio",
  "image-to-video-audio",
  "text-to-speech",
  "speech-to-speech",
  "speech-to-text",
  "music-instrumental",
  "music-vocal",
)
export type MediaKind = typeof MediaKind.Type

// kind -> `/api/v2` 기준 상대 경로 (non-free 기본형). `/free` 변형은 호출부에서 `+ "/free"` 로 붙인다.
export const mediaKindPath: Record<MediaKind, string> = {
  "text-to-image": "/media/text-to-image/models",
  "image-editing": "/media/image-editing/models",
  "text-to-video": "/media/text-to-video/models",
  "image-to-video": "/media/image-to-video/models",
  "text-to-video-audio": "/media/text-to-video-audio/models",
  "image-to-video-audio": "/media/image-to-video-audio/models",
  "text-to-speech": "/media/text-to-speech/models",
  "speech-to-speech": "/media/speech-to-speech/models",
  "speech-to-text": "/media/speech-to-text/models",
  "music-instrumental": "/media/music/instrumental/models",
  "music-vocal": "/media/music/with-vocals/models",
}
