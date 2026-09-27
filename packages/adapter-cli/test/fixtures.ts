// 테스트 전용 페이크: AaApi/Cache/Output. `@aa/adapter-cache` 는 import 하지 않는다 (어댑터 간 import 금지).
import {
  AaApi,
  Cache,
  LanguageModel,
  ModelCreator,
  Provider,
  RateLimit,
  ResponseMeta,
} from "@aa/domain"
import type { AaApiRequest, AaError, CacheEntry, QuotaSnapshot } from "@aa/domain"
import { Effect, Layer, Option, Ref } from "effect"
import { Output } from "../src/output.ts"

export const fakeMeta = new ResponseMeta({
  tier: "free",
  rate_limit: new RateLimit({ limit: 100, remaining: 87, reset: 1790000000 }),
  source: "https://artificialanalysis.ai/api/v2/language/models/free",
  cached: false,
  fetched_at: "2026-09-27T00:00:00.000Z",
})

export const sampleModel = new LanguageModel({
  id: "m1",
  name: "Sample Model",
  slug: "sample-model",
  release_date: "2026-01-01",
  model_creator: new ModelCreator({ id: "c1", name: "Creator" }),
  evaluations: { quality: 42 },
  pricing: { input: 1 },
  performance: { tps: 100 },
})

export const sampleProvider = new Provider({
  id: "p1",
  name: "Sample Provider",
  slug: "sample-provider",
})

// path -> 응답 본문 또는 실패. 등록되지 않은 path 로 호출하면 테스트가 die 로 실패해 드러난다.
export type FakeAaApiHandler = (req: AaApiRequest<unknown, unknown>) => unknown | AaError

const isAaErrorLike = (v: unknown): v is AaError =>
  typeof v === "object" && v !== null && "_tag" in v

export const makeFakeAaApi = (handlers: Record<string, FakeAaApiHandler>): Layer.Layer<AaApi> =>
  Layer.succeed(AaApi, {
    get: <A, I>(req: AaApiRequest<A, I>) => {
      const handler = handlers[req.path]
      if (handler === undefined) {
        return Effect.die(new Error(`no fake handler registered for path: ${req.path}`))
      }
      const outcome = handler(req as AaApiRequest<unknown, unknown>)
      if (isAaErrorLike(outcome)) return Effect.fail(outcome)
      return Effect.succeed({ body: outcome as A, meta: fakeMeta })
    },
  })

export const makeFakeCache = (): Layer.Layer<Cache> =>
  Layer.effect(
    Cache,
    Effect.gen(function* () {
      const store = yield* Ref.make(new Map<string, CacheEntry>())
      const rateLimit = yield* Ref.make(Option.none<QuotaSnapshot>())
      return {
        get: (key: string) =>
          Ref.get(store).pipe(Effect.map((m) => Option.fromNullable(m.get(key)))),
        set: (key: string, value: unknown, _ttlSeconds: number) =>
          Ref.update(store, (m) => new Map(m).set(key, { value, storedAt: Date.now() })),
        clear: () => Ref.set(store, new Map()),
        getRateLimit: () => Ref.get(rateLimit),
        setRateLimit: (snapshot: QuotaSnapshot) => Ref.set(rateLimit, Option.some(snapshot)),
      }
    }),
  )

// 캡처하는 인메모리 Output. 테스트에서 stdout/stderr 라인을 검증할 때 쓴다.
export interface CapturedOutput {
  readonly stdout: Array<string>
  readonly stderr: Array<string>
}

export const makeCapturingOutput = (opts?: {
  readonly isTTY?: boolean
}): { readonly captured: CapturedOutput; readonly layer: Layer.Layer<Output> } => {
  const captured: CapturedOutput = { stdout: [], stderr: [] }
  const layer = Layer.succeed(Output, {
    stdout: (line: string) => Effect.sync(() => captured.stdout.push(line)),
    stderr: (line: string) => Effect.sync(() => captured.stderr.push(line)),
    isTTY: opts?.isTTY ?? false,
    noColor: true,
  })
  return { captured, layer }
}
