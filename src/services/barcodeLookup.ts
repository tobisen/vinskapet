import type { WineBarcodeRepository } from '@/repositories/WineBarcodeRepository'
import { saveWinePurchase } from '@/search/duplicates'
import type { InventoryInput, Wine, WineBarcodeSource, WineSummary } from '@/types/domain'
import type { WineSearchProvider, WineSearchResult } from '@/types/search'
import { isValidEan, normalizeEan } from '@/utils/barcode'

export type BarcodeLookupResult =
  | { status: 'MATCH'; barcode: string; result: WineSearchResult; source: 'LOCAL' | 'SYSTEMBOLAGET' | 'OPEN_FOOD_FACTS'; mappingSource?: WineBarcodeSource }
  | { status: 'UNKNOWN'; barcode: string }
  | { status: 'OFFLINE'; barcode: string }
  | { status: 'ERROR'; barcode: string }

export type BarcodeDebugStage = 'INPUT' | 'LOCAL' | 'OPEN_FOOD_FACTS' | 'PRODUCT_GURU' | 'GTIN_HUB' | 'SYSTEMBOLAGET' | 'RESULT' | 'MAPPING'

export interface BarcodeDebugEntry {
  stage: BarcodeDebugStage
  message: string
  details?: unknown
}

export function shouldRunBarcodeLookup(barcode: string, query: string): boolean {
  return Boolean(barcode) && !query.trim()
}

type BarcodeDebug = (entry: BarcodeDebugEntry) => void

const normalizeText = (value?: string): string => (value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('sv-SE')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const tokens = (value?: string): string[] => normalizeText(value).split(' ').filter((token) => token.length > 2)

function tokenCoverage(expected?: string, actual?: string): number {
  const expectedTokens = tokens(expected)
  if (!expectedTokens.length) return 0
  const actualTokens = new Set(tokens(actual))
  return expectedTokens.filter((token) => actualTokens.has(token)).length / expectedTokens.length
}

export function evaluateSystembolagetBarcodeCandidate(
  source: WineSearchResult,
  candidate: WineSearchResult,
): { accepted: boolean; reason: string; score: number } {
  if (source.wineType && candidate.wineType && source.wineType !== candidate.wineType) {
    return { accepted: false, reason: 'Vintypen skiljer sig.', score: -1 }
  }
  if (source.vintage && candidate.vintage && source.vintage !== candidate.vintage) {
    return { accepted: false, reason: `Årgången skiljer sig (${source.vintage}/${candidate.vintage}).`, score: -1 }
  }
  const nameCoverage = Math.max(tokenCoverage(source.name, candidate.name), tokenCoverage(candidate.name, source.name))
  const producerCoverage = source.producer
    ? Math.max(tokenCoverage(source.producer, candidate.producer), tokenCoverage(source.producer, candidate.name))
    : 0
  if (nameCoverage < 0.5) return { accepted: false, reason: `För låg namnmatchning (${nameCoverage.toFixed(2)}).`, score: nameCoverage }
  if (source.producer && producerCoverage < 0.5) {
    return { accepted: false, reason: `För låg producentmatchning (${producerCoverage.toFixed(2)}).`, score: producerCoverage }
  }
  const score = nameCoverage * 7 + producerCoverage * 3
  return { accepted: true, reason: `Namn ${nameCoverage.toFixed(2)}, producent ${producerCoverage.toFixed(2)}.`, score }
}

function toSearchResult(wine: WineSummary): WineSearchResult {
  return {
    externalId: wine.id, source: 'LOCAL_COLLECTION', producer: wine.producer, name: wine.name,
    vintage: wine.vintage, country: wine.country, region: wine.region, appellation: wine.appellation,
    wineType: wine.wineType, grapes: wine.grapes, alcoholPercentage: wine.alcoholPercentage,
    imageUrl: wine.image, productNumber: wine.systembolagetProductNumber, productUrl: wine.systembolagetUrl,
    referencePrice: wine.referencePrice, currency: wine.currency, existingWine: wine, quantity: wine.quantity,
  }
}

export class BarcodeLookupService {
  constructor(
    private readonly mappings: WineBarcodeRepository,
    private readonly getWine: (id: string) => WineSummary | undefined,
    private readonly systembolaget: WineSearchProvider,
    private readonly fallback?: WineSearchProvider,
    private readonly debug: BarcodeDebug = () => undefined,
  ) {}

  async lookup(value: string, online = true): Promise<BarcodeLookupResult> {
    const barcode = normalizeEan(value)
    this.debug({ stage: 'INPUT', message: 'EAN mottagen och normaliserad.', details: { scanned: value, normalized: barcode } })
    if (!isValidEan(barcode)) throw new Error('Ogiltig EAN.')
    try {
      const mapping = await this.mappings.findByBarcode(barcode)
      const wine = mapping ? this.getWine(mapping.wineId) : undefined
      this.debug({ stage: 'LOCAL', message: mapping ? 'Lokal EAN-koppling hittades.' : 'Ingen lokal EAN-koppling.', details: mapping })
      if (wine) {
        this.debug({ stage: 'RESULT', message: 'Direktträff från wine_barcodes.', details: { wineId: wine.id, name: wine.name } })
        return { status: 'MATCH', barcode, result: toSearchResult(wine), source: 'LOCAL', mappingSource: mapping?.source }
      }
      if (mapping && !wine) this.debug({ stage: 'LOCAL', message: 'EAN-kopplingen pekar på ett vin som inte är laddat.', details: mapping })
    } catch (error) {
      this.debug({ stage: 'LOCAL', message: 'Lokal EAN-sökning misslyckades.', details: error instanceof Error ? error.message : String(error) })
      if (!online) return { status: 'OFFLINE', barcode }
    }
    if (!online) return { status: 'OFFLINE', barcode }

    try {
      const systemMatch = (await this.systembolaget.lookupBarcode?.(barcode))?.[0]
      if (systemMatch) {
        this.debug({ stage: 'SYSTEMBOLAGET', message: 'Direkt EAN-träff hos Systembolaget.', details: systemMatch })
        return { status: 'MATCH', barcode, result: systemMatch, source: 'SYSTEMBOLAGET' }
      }
      this.debug({ stage: 'SYSTEMBOLAGET', message: 'Systembolaget exponerar ingen verifierad direkt EAN-koppling.' })

      const fallbackMatches = await this.fallback?.lookupBarcode?.(barcode) ?? []
      const fallbackMatch = fallbackMatches[0]
      const externalStage: BarcodeDebugStage = fallbackMatch?.source === 'PRODUCT_GURU'
        ? 'PRODUCT_GURU'
        : fallbackMatch?.source === 'GTIN_HUB' ? 'GTIN_HUB' : 'OPEN_FOOD_FACTS'
      this.debug({
        stage: externalStage,
        message: fallbackMatch ? `${fallbackMatch.source} returnerade en produktkandidat.` : 'Ingen gratis extern EAN-källa hittade produkten.',
        details: fallbackMatch ?? { barcode, matches: 0 },
      })
      if (fallbackMatch) {
        const searchTerms = { producer: fallbackMatch.producer, name: fallbackMatch.name }
        this.debug({ stage: 'SYSTEMBOLAGET', message: 'Söker Systembolaget med produkttext från Open Food Facts.', details: searchTerms })
        let candidates: WineSearchResult[] = []
        try {
          candidates = this.systembolaget.searchWine
            ? await this.systembolaget.searchWine({ ...searchTerms, producer: searchTerms.producer ?? '', systembolagetProductNumber: undefined })
            : await this.systembolaget.search([searchTerms.producer, searchTerms.name].filter(Boolean).join(' '))
        } catch (error) {
          this.debug({ stage: 'SYSTEMBOLAGET', message: 'Textmatchningen hos Systembolaget misslyckades; Open Food Facts-träffen behålls.', details: error instanceof Error ? error.message : String(error) })
        }
        const evaluated = candidates.map((candidate) => ({ candidate, ...evaluateSystembolagetBarcodeCandidate(fallbackMatch, candidate) }))
          .sort((a, b) => b.score - a.score)
        this.debug({
          stage: 'SYSTEMBOLAGET',
          message: `${candidates.length} kandidater utvärderades.`,
          details: evaluated.map(({ candidate, accepted, reason }) => ({ productNumber: candidate.productNumber, name: candidate.name, producer: candidate.producer, accepted, reason })),
        })
        const matched = evaluated.find((candidate) => candidate.accepted)?.candidate
        if (matched) {
          this.debug({ stage: 'RESULT', message: 'Verifierad Systembolaget-kandidat vald.', details: matched })
          return { status: 'MATCH', barcode, result: matched, source: 'SYSTEMBOLAGET' }
        }
        if (fallbackMatch.source === 'OPEN_FOOD_FACTS') {
          this.debug({ stage: 'RESULT', message: 'Open Food Facts-träffen används utan Systembolaget-match.', details: fallbackMatch })
          return { status: 'MATCH', barcode, result: fallbackMatch, source: 'OPEN_FOOD_FACTS' }
        }
        this.debug({
          stage: 'RESULT',
          message: `${fallbackMatch.source}-kandidaten kunde inte verifieras mot Systembolaget och används därför inte automatiskt.`,
          details: fallbackMatch,
        })
        return { status: 'UNKNOWN', barcode }
      }
      this.debug({ stage: 'RESULT', message: 'Ingen extern EAN-träff. Manuell vinsökning krävs.' })
      return { status: 'UNKNOWN', barcode }
    } catch (error) {
      this.debug({ stage: 'RESULT', message: 'Extern EAN-sökning misslyckades tekniskt.', details: error instanceof Error ? error.message : String(error) })
      return { status: 'ERROR', barcode }
    }
  }
}

export function mergeBarcodeWine(result: WineSearchResult, wine: Wine): Wine {
  return { ...wine, image: wine.image ?? result.imageUrl, systembolagetProductNumber: wine.systembolagetProductNumber ?? result.productNumber, systembolagetUrl: wine.systembolagetUrl ?? result.productUrl }
}

export async function saveBarcodePurchase(options: {
  barcode: string
  wine: Wine
  existingWine?: Wine
  inventory: InventoryInput
  source: WineBarcodeSource
  mappings: WineBarcodeRepository
  createWine: (wine: Wine, inventory: InventoryInput) => Promise<boolean>
  addInventory: (wineId: string, inventory: InventoryInput) => Promise<boolean>
}): Promise<{ saved: boolean; wineId: string }> {
  const saved = await saveWinePurchase(options.wine, options.inventory, options.existingWine, options)
  if (saved.saved) await options.mappings.addMapping(options.barcode, saved.wineId, options.source)
  return saved
}
