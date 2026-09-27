import type { Wine } from '@/types/domain'
import type { WineSearchProvider, WineSearchResult } from '@/types/search'

const ignoredTokens = new Set(['de', 'del', 'della', 'di', 'du', 'la', 'le', 'les', 'the', 'vin', 'wine'])

function normalize(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('sv-SE')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokens(value?: string): string[] {
  return normalize(value).split(' ').filter((token) => token.length > 1 && !ignoredTokens.has(token))
}

function coverage(expected?: string, actual?: string): number {
  const expectedTokens = tokens(expected)
  if (!expectedTokens.length) return 0
  const actualTokens = new Set(tokens(actual))
  return expectedTokens.filter((token) => actualTokens.has(token)).length / expectedTokens.length
}

export function scoreWineImageCandidate(wine: Wine, result: WineSearchResult): number {
  if (!result.imageUrl || (result.wineType && result.wineType !== wine.wineType)) return -1
  const nameCoverage = coverage(wine.name, result.name)
  if (nameCoverage < 0.6) return -1

  let score = nameCoverage * 8
  const producerCoverage = coverage(wine.producer, result.producer)
  if (wine.producer.trim()) {
    if (producerCoverage === 0) return -1
    score += producerCoverage * 5
  }
  if (normalize(wine.name) === normalize(result.name)) score += 3
  if (wine.vintage && result.vintage) score += wine.vintage === result.vintage ? 2 : -0.5
  if (wine.country && result.country && normalize(wine.country) === normalize(result.country)) score += 1
  return score
}

export function findBestWineImage(wine: Wine, results: WineSearchResult[]): WineSearchResult | undefined {
  const ranked = results
    .map((result) => ({ result, score: scoreWineImageCandidate(wine, result) }))
    .filter(({ score }) => score >= 7)
    .sort((a, b) => b.score - a.score)
  if (!ranked[0] || (ranked[1] && ranked[0].score - ranked[1].score < 1.5)) return undefined
  return ranked[0].result
}

export async function backfillMissingWineImages(
  wines: readonly Wine[],
  provider: WineSearchProvider,
  updateWine: (wine: Wine) => Promise<boolean>,
): Promise<number> {
  let updated = 0
  for (const wine of wines.filter((item) => !item.image)) {
    try {
      const match = findBestWineImage(wine, await provider.search(wine.name))
      if (!match?.imageUrl) continue
      const saved = await updateWine({
        ...wine,
        image: match.imageUrl,
        systembolagetProductNumber: wine.systembolagetProductNumber ?? match.productNumber,
        systembolagetUrl: wine.systembolagetUrl ?? match.productUrl,
        updatedAt: new Date().toISOString(),
      })
      if (saved) updated += 1
    } catch {
      // Image enrichment is best-effort and must never block the collection.
    }
  }
  return updated
}
