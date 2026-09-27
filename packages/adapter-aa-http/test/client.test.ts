import { describe, expect, test } from "bun:test"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import type { AaApiRequest } from "@aa/domain"
import {
  AaApi,
  AuthError,
  BadRequest,
  NotFound,
  RateLimited,
  ServerError,
  TierError,
} from "@aa/domain"
import { ConfigProvider, Effect, Layer, Schema } from "effect"
import { AaApiLive } from "../src/client.ts"

const TEST_KEY = "aa-test-secret-key"

const TestBody = Schema.Struct({
  tier: Schema.Literal("free", "pro", "commercial"),
  value: Schema.String,
})

const testRequest: AaApiRequest<typeof TestBody.Type, typeof TestBody.Encoded> = {
  path: "/language/models/free",
  schema: TestBody,
}

const configWithKey = ConfigProvider.fromMap(new Map([["AA_APIKEY", TEST_KEY]]))
const configWithoutKey = ConfigProvider.fromMap(new Map())

const httpClientLayer = (handler: (request: HttpClientRequest.HttpClientRequest) => Response) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.succeed(HttpClientResponse.fromWeb(request, handler(request))),
    ),
  )

const runGet = <A, I>(
  req: AaApiRequest<A, I>,
  handler: (request: HttpClientRequest.HttpClientRequest) => Response,
  configProvider: ConfigProvider.ConfigProvider = configWithKey,
) =>
  Effect.gen(function* () {
    const api = yield* AaApi
    return yield* api.get(req)
  }).pipe(
    Effect.provide(AaApiLive),
    Effect.provide(httpClientLayer(handler)),
    Effect.withConfigProvider(configProvider),
    Effect.runPromiseExit,
  )

describe("AaApiLive", () => {
  test("decodes a successful response and parses meta from headers", async () => {
    const exit = await runGet(
      testRequest,
      () =>
        new Response(JSON.stringify({ tier: "free", value: "ok" }), {
          status: 200,
          headers: {
            "X-AA-Tier": "free",
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": "87",
            "X-RateLimit-Reset": "1790000000",
          },
        }),
    )

    expect(exit._tag).toBe("Success")
    if (exit._tag !== "Success") return
    expect(exit.value.body).toEqual({ tier: "free", value: "ok" })
    expect(exit.value.meta.tier).toBe("free")
    expect(exit.value.meta.rate_limit).toEqual({ limit: 100, remaining: 87, reset: 1790000000 })
    expect(exit.value.meta.cached).toBe(false)
    expect(exit.value.meta.source).toBe("https://artificialanalysis.ai/api/v2/language/models/free")
    expect(new Date(exit.value.meta.fetched_at).toString()).not.toBe("Invalid Date")
  })

  test("falls back to body tier when X-AA-Tier header is missing", async () => {
    const exit = await runGet(
      testRequest,
      () => new Response(JSON.stringify({ tier: "pro", value: "ok" }), { status: 200 }),
    )

    expect(exit._tag).toBe("Success")
    if (exit._tag !== "Success") return
    expect(exit.value.meta.tier).toBe("pro")
    expect(exit.value.meta.rate_limit).toBeNull()
  })

  test("maps 400 to BadRequest with API error message", async () => {
    const exit = await runGet(
      testRequest,
      () => new Response(JSON.stringify({ error: "bad field name" }), { status: 400 }),
    )

    expect(exit._tag).toBe("Failure")
    if (exit._tag !== "Failure") return
    const error = exit.cause._tag === "Fail" ? exit.cause.error : undefined
    expect(error).toBeInstanceOf(BadRequest)
    expect((error as BadRequest).message).toBe("bad field name")
  })

  test("maps 401 to AuthError", async () => {
    const exit = await runGet(
      testRequest,
      () => new Response(JSON.stringify({ error: "invalid key" }), { status: 401 }),
    )
    expect(exit._tag).toBe("Failure")
    if (exit._tag !== "Failure") return
    const error = exit.cause._tag === "Fail" ? exit.cause.error : undefined
    expect(error).toBeInstanceOf(AuthError)
  })

  test("maps 403 to TierError with upgrade hint", async () => {
    const exit = await runGet(
      testRequest,
      () => new Response(JSON.stringify({ error: "needs pro" }), { status: 403 }),
    )
    expect(exit._tag).toBe("Failure")
    if (exit._tag !== "Failure") return
    const error = exit.cause._tag === "Fail" ? exit.cause.error : undefined
    expect(error).toBeInstanceOf(TierError)
    expect((error as TierError).hint).toContain("--free")
  })

  test("maps 404 to NotFound", async () => {
    const exit = await runGet(
      testRequest,
      () => new Response(JSON.stringify({ error: "no such slug" }), { status: 404 }),
    )
    expect(exit._tag).toBe("Failure")
    if (exit._tag !== "Failure") return
    const error = exit.cause._tag === "Fail" ? exit.cause.error : undefined
    expect(error).toBeInstanceOf(NotFound)
  })

  test("maps 429 to RateLimited with retryAfter and resetAt", async () => {
    const exit = await runGet(
      testRequest,
      () =>
        new Response(JSON.stringify({ error: "quota exceeded" }), {
          status: 429,
          headers: { "Retry-After": "30", "X-RateLimit-Reset": "1790000000" },
        }),
    )

    expect(exit._tag).toBe("Failure")
    if (exit._tag !== "Failure") return
    const error = exit.cause._tag === "Fail" ? exit.cause.error : undefined
    expect(error).toBeInstanceOf(RateLimited)
    expect((error as RateLimited).retryAfter).toBe(30)
    expect((error as RateLimited).resetAt).toBe(1790000000)
  })

  test("maps 500 to ServerError after exhausting retries", async () => {
    const exit = await runGet(
      testRequest,
      () => new Response(JSON.stringify({ error: "boom" }), { status: 500 }),
    )
    expect(exit._tag).toBe("Failure")
    if (exit._tag !== "Failure") return
    const error = exit.cause._tag === "Fail" ? exit.cause.error : undefined
    expect(error).toBeInstanceOf(ServerError)
  }, 10_000)

  test("missing AA_APIKEY yields AuthError without calling the network", async () => {
    let calls = 0
    const exit = await runGet(
      testRequest,
      () => {
        calls++
        return new Response(JSON.stringify({ tier: "free", value: "ok" }), { status: 200 })
      },
      configWithoutKey,
    )

    expect(calls).toBe(0)
    expect(exit._tag).toBe("Failure")
    if (exit._tag !== "Failure") return
    const error = exit.cause._tag === "Fail" ? exit.cause.error : undefined
    expect(error).toBeInstanceOf(AuthError)
    expect((error as AuthError).hint).toContain("AA_APIKEY")
  })

  test("never leaks the API key in error messages", async () => {
    const exit = await runGet(
      testRequest,
      () => new Response(JSON.stringify({ error: "bad" }), { status: 400 }),
    )
    expect(exit._tag).toBe("Failure")
    if (exit._tag !== "Failure") return
    const serialized = JSON.stringify(exit)
    expect(serialized).not.toContain(TEST_KEY)
  })

  test("retries a 500 once then succeeds", async () => {
    let calls = 0
    const exit = await runGet(testRequest, () => {
      calls++
      if (calls === 1) return new Response(JSON.stringify({ error: "transient" }), { status: 500 })
      return new Response(JSON.stringify({ tier: "free", value: "recovered" }), { status: 200 })
    })

    expect(calls).toBe(2)
    expect(exit._tag).toBe("Success")
    if (exit._tag !== "Success") return
    expect(exit.value.body.value).toBe("recovered")
  }, 10_000)

  test("does not retry a 400", async () => {
    let calls = 0
    const exit = await runGet(testRequest, () => {
      calls++
      return new Response(JSON.stringify({ error: "bad" }), { status: 400 })
    })

    expect(calls).toBe(1)
    expect(exit._tag).toBe("Failure")
  })
})
