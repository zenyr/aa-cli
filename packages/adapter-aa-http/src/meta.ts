import type { Headers } from "@effect/platform"
import { RateLimit, ResponseMeta, Tier } from "@aa/domain"
import { Clock, Effect, Option, Schema } from "effect"

const findHeader = (headers: Headers.Headers, name: string): Option.Option<string> => {
  const key = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  )
  if (key === undefined) return Option.none()
  const value = headers[key]
  return value === undefined ? Option.none() : Option.some(value)
}

const parseNumberHeader = (headers: Headers.Headers, name: string): number | undefined => {
  const raw = Option.getOrUndefined(findHeader(headers, name))
  if (raw === undefined) return undefined
  const parsed = Number(raw)
  return Number.isNaN(parsed) ? undefined : parsed
}

// 응답 헤더에서 RateLimit 을 조립한다. 하나라도 없으면 null.
export const buildRateLimit = (headers: Headers.Headers): RateLimit | null => {
  const limit = parseNumberHeader(headers, "x-ratelimit-limit")
  const remaining = parseNumberHeader(headers, "x-ratelimit-remaining")
  const reset = parseNumberHeader(headers, "x-ratelimit-reset")
  if (limit === undefined || remaining === undefined || reset === undefined) return null
  return new RateLimit({ limit, remaining, reset })
}

// `Retry-After` 헤더 (초 단위).
export const readRetryAfter = (headers: Headers.Headers): number | undefined =>
  parseNumberHeader(headers, "retry-after")

// `X-RateLimit-Reset` 헤더 (unix ts).
export const readResetAt = (headers: Headers.Headers): number | undefined =>
  parseNumberHeader(headers, "x-ratelimit-reset")

// `X-AA-Tier` 헤더, 없으면 바디의 `tier` 필드로 대체한다.
export const readTier = (headers: Headers.Headers, bodyTier: unknown): Tier | null => {
  const headerTier = Option.getOrUndefined(findHeader(headers, "x-aa-tier"))
  const candidate = headerTier ?? bodyTier
  return Schema.is(Tier)(candidate) ? candidate : null
}

// 키를 제거한 요청 URL, `ResponseMeta.source` 용. baseUrl 뒤 슬래시, path 앞 슬래시를 정규화한다.
export const sourceUrl = (baseUrl: string, path: string, query: Record<string, string>): string => {
  const base = baseUrl.replace(/\/+$/, "")
  const suffix = path.startsWith("/") ? path : `/${path}`
  const url = new URL(`${base}${suffix}`)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return url.toString()
}

// 응답 헤더 + 바디 tier 로부터 ResponseMeta 를 만든다.
export const buildResponseMeta = (
  headers: Headers.Headers,
  bodyTier: unknown,
  source: string,
): Effect.Effect<ResponseMeta> =>
  Effect.map(
    Clock.currentTimeMillis,
    (nowMs) =>
      new ResponseMeta({
        tier: readTier(headers, bodyTier),
        rate_limit: buildRateLimit(headers),
        source,
        cached: false,
        fetched_at: new Date(nowMs).toISOString(),
      }),
  )
