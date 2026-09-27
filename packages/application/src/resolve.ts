import { NotFound, UsageError } from "@aa/domain"
import { Effect, Either } from "effect"

const maxAlternatives = 5
const maxCandidates = 8
const maxNearSlugs = 5

// NFKC 정규화 후 소문자, 구분자를 "-" 로 통일하고 중복/양끝 대시를 정리한다.
export const normalizeQuery = (s: string): string =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.\s_/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

export interface Resolved<A> {
  readonly item: A
  readonly alternatives: ReadonlyArray<string>
}

interface Sluggable {
  readonly slug: string
  readonly name: string
}

const segmentsOf = (s: string): ReadonlyArray<string> => s.split("-").filter((p) => p.length > 0)

// query 세그먼트가 target 세그먼트 안에서 연속으로 나타나면 시작 인덱스, 아니면 -1.
const findContiguousRun = (target: ReadonlyArray<string>, query: ReadonlyArray<string>): number => {
  if (query.length === 0 || query.length > target.length) return -1
  for (let start = 0; start <= target.length - query.length; start += 1) {
    let ok = true
    for (let i = 0; i < query.length; i += 1) {
      if (target[start + i] !== query[i]) {
        ok = false
        break
      }
    }
    if (ok) return start
  }
  return -1
}

interface Candidate<A extends Sluggable> {
  readonly item: A
  readonly extra: number
}

const candidateOf = <A extends Sluggable>(item: A, query: string): Candidate<A> | undefined => {
  const querySegments = segmentsOf(query)
  const slugSegments = segmentsOf(item.slug)
  const nameSegments = segmentsOf(normalizeQuery(item.name))

  const slugStart = findContiguousRun(slugSegments, querySegments)
  const nameStart = findContiguousRun(nameSegments, querySegments)
  if (slugStart === -1 && nameStart === -1) return undefined

  const extras: Array<number> = []
  if (slugStart !== -1) extras.push(slugSegments.length - querySegments.length)
  if (nameStart !== -1) extras.push(nameSegments.length - querySegments.length)
  const extra = Math.min(...extras)
  return { item, extra }
}

// 세그먼트 매치 후보를 extra(오름차순) → slug 길이 → slug 알파벳 순으로 정렬한다.
export const rankCandidates = <A extends Sluggable>(
  items: ReadonlyArray<A>,
  query: string,
): ReadonlyArray<A> => {
  const normalized = normalizeQuery(query)
  const candidates = items.flatMap((item) => {
    const c = candidateOf(item, normalized)
    return c === undefined ? [] : [c]
  })
  const sorted = candidates.toSorted((a, b) => {
    if (a.extra !== b.extra) return a.extra - b.extra
    if (a.item.slug.length !== b.item.slug.length) return a.item.slug.length - b.item.slug.length
    return a.item.slug.localeCompare(b.item.slug)
  })
  return sorted.map((c) => c.item)
}

const nearSlugsHint = <A extends Sluggable>(
  items: ReadonlyArray<A>,
  query: string,
): string | undefined => {
  const normalized = normalizeQuery(query)
  const querySegments = new Set(segmentsOf(normalized))
  const near = items.filter((item) => segmentsOf(item.slug).some((s) => querySegments.has(s)))
  if (near.length === 0) return undefined
  return `near matches: ${near
    .slice(0, maxNearSlugs)
    .map((i) => i.slug)
    .join(", ")}`
}

// 이름/slug 로 모델 하나를 찾는다. 정확한 slug, 정규화 일치, 세그먼트 매치 순으로 시도한다.
export const resolveOne = <A extends Sluggable>(
  items: ReadonlyArray<A>,
  query: string,
): Either.Either<Resolved<A>, NotFound | UsageError> => {
  const exactSlug = items.find((item) => item.slug === query)
  if (exactSlug !== undefined) return Either.right({ item: exactSlug, alternatives: [] })

  const normalized = normalizeQuery(query)
  const normalizedMatch = items.find(
    (item) => normalized === item.slug || normalized === normalizeQuery(item.name),
  )
  if (normalizedMatch !== undefined)
    return Either.right({ item: normalizedMatch, alternatives: [] })

  const ranked = rankCandidates(items, query)
  if (ranked.length === 0) {
    const hint = `no match for "${query}"; try \`aa find ${query}\``
    const near = nearSlugsHint(items, query)
    return Either.left(
      new NotFound({
        message: `model not found: ${query}`,
        hint: near === undefined ? hint : `${hint}; ${near}`,
      }),
    )
  }

  const bestExtra = candidateOf(ranked[0] as A, normalized)?.extra
  const tiedAtBest = ranked.filter((item) => candidateOf(item, normalized)?.extra === bestExtra)
  if (tiedAtBest.length > 1) {
    return Either.left(
      new UsageError({
        message: `ambiguous model "${query}"`,
        hint: `candidates: ${tiedAtBest
          .slice(0, maxCandidates)
          .map((i) => i.slug)
          .join(", ")}`,
      }),
    )
  }

  const best = ranked[0] as A
  const alternatives = ranked.slice(1, 1 + maxAlternatives).map((i) => i.slug)
  return Either.right({ item: best, alternatives })
}

// `resolveOne` 결과를 Effect 로 승격한다.
export const resolveOneEffect = <A extends Sluggable>(
  items: ReadonlyArray<A>,
  query: string,
): Effect.Effect<Resolved<A>, NotFound | UsageError> =>
  Either.match(resolveOne(items, query), { onLeft: Effect.fail, onRight: Effect.succeed })
