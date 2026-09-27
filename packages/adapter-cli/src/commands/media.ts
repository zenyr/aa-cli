// `aa media <kind> [--free] [--categories|--genres]`: 미디어 아레나 모델 목록.
import { listMedia, summaryFields } from "@aa/application"
import type { ListMediaOpts } from "@aa/application"
import { MediaKind } from "@aa/domain"
import { Args, Command, Options } from "@effect/cli"
import { dataOptions, freeOptOf } from "../global-options.ts"
import { commonOptsOf, runListCommand } from "./support.ts"

const kind = Args.choice(MediaKind.literals.map((k) => [k, k] as const)).pipe(
  Args.withDescription("미디어 아레나 종류"),
)

const categories = Options.boolean("categories").pipe(
  Options.withDefault(false),
  Options.withDescription("카테고리 정보 포함"),
)

const genres = Options.boolean("genres").pipe(
  Options.withDefault(false),
  Options.withDescription("장르 정보 포함"),
)

export const mediaCommand = Command.make(
  "media",
  { ...dataOptions, kind, categories, genres },
  (opts) => {
    const mediaOpts: ListMediaOpts = {
      ...commonOptsOf(opts),
      ...freeOptOf(opts),
      categories: opts.categories,
      genres: opts.genres,
    }
    return runListCommand(opts, summaryFields.mediaModel, listMedia(opts.kind, mediaOpts))
  },
).pipe(Command.withDescription("미디어 아레나 모델 목록"))
