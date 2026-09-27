// `aa-cli media <kind> [--free] [--categories|--genres]`: 미디어 아레나 모델 목록.
import { listMedia, summaryFields } from "@aa/application"
import type { ListMediaOpts } from "@aa/application"
import { MediaKind } from "@aa/domain"
import { Args, Command, Options } from "@effect/cli"
import { fetchOptions, freeOptOf, freeOption, outputOptions } from "../global-options.ts"
import { commonOptsOf, runListCommand } from "./support.ts"

const kind = Args.choice(MediaKind.literals.map((k) => [k, k] as const)).pipe(
  Args.withDescription("Media arena kind"),
)

const categories = Options.boolean("categories").pipe(
  Options.withDefault(false),
  Options.withDescription("Include category info"),
)

const genres = Options.boolean("genres").pipe(
  Options.withDefault(false),
  Options.withDescription("Include genre info"),
)

export const mediaCommand = Command.make(
  "media",
  { ...outputOptions, ...fetchOptions, ...freeOption, kind, categories, genres },
  (opts) => {
    const mediaOpts: ListMediaOpts = {
      ...commonOptsOf(opts),
      ...freeOptOf(opts),
      categories: opts.categories,
      genres: opts.genres,
    }
    return runListCommand(opts, summaryFields.mediaModel, listMedia(opts.kind, mediaOpts))
  },
).pipe(Command.withDescription("Media arena rankings (text-to-image, text-to-video, ...)"))
