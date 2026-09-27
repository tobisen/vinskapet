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
  ) {}

  async lookup(value: string, online = true): Promise<BarcodeLookupResult> {
    const barcode = normalizeEan(value)
    if (!isValidEan(barcode)) throw new Error('Ogiltig EAN.')
    try {
      const mapping = await this.mappings.findByBarcode(barcode)
      const wine = mapping ? this.getWine(mapping.wineId) : undefined
      if (wine) return { status: 'MATCH', barcode, result: toSearchResult(wine), source: 'LOCAL', mappingSource: mapping?.source }
    } catch {
      if (!online) return { status: 'OFFLINE', barcode }
    }
    if (!online) return { status: 'OFFLINE', barcode }

    try {
      const systemMatch = (await this.systembolaget.lookupBarcode?.(barcode))?.[0]
      if (systemMatch) return { status: 'MATCH', barcode, result: systemMatch, source: 'SYSTEMBOLAGET' }
      const fallbackMatch = (await this.fallback?.lookupBarcode?.(barcode))?.[0]
      if (fallbackMatch) return { status: 'MATCH', barcode, result: fallbackMatch, source: 'OPEN_FOOD_FACTS' }
      return { status: 'UNKNOWN', barcode }
    } catch {
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
