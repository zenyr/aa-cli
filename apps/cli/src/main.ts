#!/usr/bin/env bun
// composition root: 모든 레이어를 Layer 로 조립한다
import { AaApiLive } from "@aa/adapter-aa-http"
import { CacheFileLive } from "@aa/adapter-cache"
import { OutputLive, run } from "@aa/adapter-cli"
import { FetchHttpClient } from "@effect/platform"
import { BunContext } from "@effect/platform-bun"
import { Effect, Layer, Logger, LogLevel } from "effect"
import { buildConfigProvider } from "./config-provider.ts"

const MainLive = Layer.mergeAll(
  AaApiLive.pipe(Layer.provide(FetchHttpClient.layer)),
  CacheFileLive.pipe(Layer.provide(BunContext.layer)),
  OutputLive,
  BunContext.layer,
)

const logLevel = process.env["AA_DEBUG"] === undefined ? LogLevel.None : LogLevel.Debug

const program = run(process.argv).pipe(
  Effect.provide(MainLive),
  Effect.withConfigProvider(buildConfigProvider()),
  Logger.withMinimumLogLevel(logLevel),
)

const code = await Effect.runPromise(program)
process.exit(code)
