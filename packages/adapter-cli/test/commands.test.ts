// 커맨드 수준 통합 테스트: 페이크 AaApi/Cache 로 `run(argv)` 를 끝까지 돌린다.
import { LanguageModel, ModelCreator, NotFound, TierError } from "@aa/domain"
import { BunContext } from "@effect/platform-bun"
import { Effect, Layer } from "effect"
import { describe, expect, it } from "bun:test"
import { run } from "../src/index.ts"
import {
  makeCapturingOutput,
  makeFakeAaApi,
  makeFakeCache,
  sampleModel,
  sampleProvider,
  type FakeAaApiHandler,
} from "./fixtures.ts"

const secondModel = new LanguageModel({
  id: "m2",
  name: "Sample Model 5.5",
  slug: "sample-model-5-5",
  release_date: "2026-02-01",
  model_creator: new ModelCreator({ id: "c1", name: "Creator" }),
  evaluations: { quality: 50 },
  pricing: { input: 2 },
  performance: { tps: 120 },
})

const runCli = (argv: ReadonlyArray<string>, handlers: Record<string, FakeAaApiHandler>) => {
  const { captured, layer: outputLayer } = makeCapturingOutput()
  const layer = Layer.mergeAll(
    makeFakeAaApi(handlers),
    makeFakeCache(),
    outputLayer,
    BunContext.layer,
  )
  const exitCode = Effect.runSync(run(["bun", "aa", ...argv]).pipe(Effect.provide(layer)))
  return { captured, exitCode }
}

describe("aa models", () => {
  it("lists language models as json by default (non-TTY)", () => {
    const { captured, exitCode } = runCli(["models"], {
      "/language/models": () => ({ tier: "free", data: [sampleModel] }),
    })
    expect(exitCode).toBe(0)
    expect(captured.stdout).toHaveLength(1)
    const parsed = JSON.parse(captured.stdout[0] ?? "{}")
    expect(parsed.data[0].slug).toBe("sample-model")
    expect(parsed.meta.tier).toBe("free")
  })
})

describe("aa model", () => {
  it("fetches a single model by slug", () => {
    const { captured, exitCode } = runCli(["model", "sample-model"], {
      "/language/models/sample-model": () => ({ tier: "free", data: sampleModel }),
    })
    expect(exitCode).toBe(0)
    const parsed = JSON.parse(captured.stdout[0] ?? "{}")
    expect(parsed.data.slug).toBe("sample-model")
  })

  it("maps NotFound to exit code 5 and writes to stderr", () => {
    const { captured, exitCode } = runCli(["model", "missing"], {
      "/language/models/missing": () => new NotFound({ message: "no such model", status: 404 }),
    })
    expect(exitCode).toBe(5)
    expect(captured.stderr.length).toBeGreaterThan(0)
  })
})

describe("aa providers", () => {
  it("lists providers", () => {
    const { captured, exitCode } = runCli(["providers"], {
      "/language/providers": () => ({ data: [sampleProvider] }),
    })
    expect(exitCode).toBe(0)
    const parsed = JSON.parse(captured.stdout[0] ?? "{}")
    expect(parsed.data[0].slug).toBe("sample-provider")
  })
})

describe("aa quota", () => {
  it("reports an empty snapshot before any call was made", () => {
    const { captured, exitCode } = runCli(["quota"], {})
    expect(exitCode).toBe(0)
    expect(captured.stdout).toHaveLength(1)
  })
})

describe("aa endpoints", () => {
  it("lists the static endpoint catalogue", () => {
    const { captured, exitCode } = runCli(["endpoints"], {})
    expect(exitCode).toBe(0)
    const parsed = JSON.parse(captured.stdout[0] ?? "{}")
    expect(Array.isArray(parsed.data)).toBe(true)
    expect(parsed.data.length).toBeGreaterThan(0)
  })
})

describe("aa schema", () => {
  it("returns a JSON schema for the models command", () => {
    const { captured, exitCode } = runCli(["schema", "models"], {})
    expect(exitCode).toBe(0)
    const schema = JSON.parse(captured.stdout[0] ?? "{}")
    expect(schema.type).toBe("array")
  })
})

describe("aa raw", () => {
  it("performs an arbitrary GET and prints the raw body", () => {
    const { captured, exitCode } = runCli(["raw", "/language/models/free"], {
      "/language/models/free": () => ({ tier: "free", data: [] }),
    })
    expect(exitCode).toBe(0)
    const parsed = JSON.parse(captured.stdout[0] ?? "{}")
    expect(parsed.data.tier).toBe("free")
  })

  it("rejects a malformed --query value with a usage error", () => {
    const { exitCode } = runCli(["raw", "/x", "--query", "noequals"], {
      "/x": () => ({}),
    })
    expect(exitCode).toBe(2)
  })
})

describe("aa find", () => {
  it("joins multiple words into a single query", () => {
    const { captured, exitCode } = runCli(["find", "sample", "model", "5.5"], {
      "/language/models": () => ({ tier: "free", data: [sampleModel, secondModel] }),
    })
    expect(exitCode).toBe(0)
    const parsed = JSON.parse(captured.stdout[0] ?? "{}")
    expect(parsed.data[0].slug).toBe("sample-model-5-5")
  })
})

describe("aa compare", () => {
  it("writes resolution notices to stderr, prefixed note:, for table format", () => {
    const { captured, exitCode } = runCli(
      ["compare", "sample model", "sample model 5.5", "--format", "table"],
      {
        "/language/models": () => ({ tier: "free", data: [sampleModel, secondModel] }),
      },
    )
    expect(exitCode).toBe(0)
    const noticeLines = captured.stderr.filter((l) => l.startsWith("note: "))
    expect(noticeLines.length).toBeGreaterThan(0)
  })
})

describe("ambiguity errors", () => {
  it("renders the candidates hint to stderr as json with exit code 2", () => {
    const ambiguousA = new LanguageModel({
      id: "a1",
      name: "Opus 4",
      slug: "opus-4",
      release_date: "2026-01-01",
      model_creator: new ModelCreator({ id: "c1", name: "Creator" }),
      evaluations: {},
      pricing: {},
      performance: {},
    })
    const ambiguousB = new LanguageModel({
      id: "a2",
      name: "Opus 5",
      slug: "opus-5",
      release_date: "2026-01-01",
      model_creator: new ModelCreator({ id: "c1", name: "Creator" }),
      evaluations: {},
      pricing: {},
      performance: {},
    })
    const { captured, exitCode } = runCli(["model", "opus", "--format", "json"], {
      "/language/models": () => ({ tier: "free", data: [ambiguousA, ambiguousB] }),
      "/language/models/opus": () => new TierError({ message: "pro required", status: 403 }),
    })
    expect(exitCode).toBe(2)
    expect(captured.stderr.length).toBeGreaterThan(0)
    const parsed = JSON.parse(captured.stderr[0] ?? "{}")
    expect(parsed.error.code).toBe("usage")
    expect(parsed.error.hint).toContain("candidates:")
  })
})

describe("aa (no subcommand)", () => {
  it("exits 2 and writes a usage message", () => {
    const { captured, exitCode } = runCli([], {})
    expect(exitCode).toBe(2)
    expect(captured.stderr.length).toBeGreaterThan(0)
  })
})
