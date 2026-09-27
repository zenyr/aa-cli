import { HttpClient, HttpClientRequest } from "@effect/platform"
import type { AaApiRequest } from "@aa/domain"
import { AaApi, AuthError, NetworkError } from "@aa/domain"
import { Config, Effect, Layer, Redacted, Schedule, Schema } from "effect"
import {
  readErrorBody,
  toDecodeError,
  toNetworkError,
  toRateLimited,
  toStatusError,
} from "./errors.ts"
import { buildResponseMeta, readResetAt, readRetryAfter, sourceUrl } from "./meta.ts"
import { toUrlParams } from "./query.ts"

const DEFAULT_BASE_URL = "https://artificialanalysis.ai/api/v2"

const apiKeyConfig = Config.redacted("AA_APIKEY").pipe(
  Effect.mapError(
    () =>
      new AuthError({ message: "AA_APIKEY is not set", hint: "set AA_APIKEY (see .env.example)" }),
  ),
)

// 5xx / NetworkError 만 재시도한다. 4xx, 429, Auth, Decode 는 즉시 실패시킨다.
const retrySchedule = Schedule.exponential("200 millis").pipe(
  Schedule.intersect(Schedule.recurs(2)),
)

const isRetryable = (error: { readonly _tag: string }): boolean =>
  error._tag === "ServerError" || error._tag === "NetworkError"

const executeOnce = <A, I>(
  client: HttpClient.HttpClient,
  baseUrl: string,
  req: AaApiRequest<A, I>,
) =>
  Effect.gen(function* () {
    const key = yield* apiKeyConfig
    const query = toUrlParams(req.query)
    const url = sourceUrl(baseUrl, req.path, query)

    const request = HttpClientRequest.get(url).pipe(
      HttpClientRequest.setHeader("x-api-key", Redacted.value(key)),
    )

    const response = yield* Effect.mapError(client.execute(request), toNetworkError)

    const raw = yield* Effect.mapError(
      response.json,
      (cause) => new NetworkError({ message: `failed to read response body: ${cause.message}` }),
    )

    if (response.status < 200 || response.status >= 300) {
      const body = readErrorBody(raw)
      if (response.status === 429) {
        return yield* Effect.fail(
          toRateLimited(body, readRetryAfter(response.headers), readResetAt(response.headers)),
        )
      }
      return yield* Effect.fail(toStatusError(response.status, body))
    }

    const decoded = yield* Effect.mapError(Schema.decodeUnknown(req.schema)(raw), toDecodeError)
    const bodyTier =
      typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>)["tier"] : undefined
    const meta = yield* buildResponseMeta(response.headers, bodyTier, url)

    return { body: decoded, meta }
  })

// AA API 포트 구현. HttpClient 를 요구하고, 키 없이도 레이어 구성은 실패하지 않는다.
export const AaApiLive: Layer.Layer<AaApi, never, HttpClient.HttpClient> = Layer.effect(
  AaApi,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const baseUrl = yield* Config.string("AA_BASE_URL").pipe(
      Config.withDefault(DEFAULT_BASE_URL),
      Effect.orDie,
    )

    return AaApi.of({
      get: (req) =>
        executeOnce(client, baseUrl, req).pipe(
          Effect.retry({ schedule: retrySchedule, while: isRetryable }),
        ),
    })
  }),
)
