import type { WineSummary } from '@/types/domain'
import type { WineSearchProvider, WineSearchResult } from '@/types/search'
import { normalizeEan } from '@/utils/barcode'

const searchable = (wine: WineSummary): string => [
  wine.producer,
  wine.name,
  wine.vintage,
  wine.country,
  wine.region,
  wine.appellation,
  ...wine.grapes,
  wine.systembolagetProductNumber,
].filter(Boolean).join(' ').toLocaleLowerCase('sv-SE')

const toResult = (wine: WineSummary): WineSearchResult => ({
  externalId: wine.id,
  source: 'LOCAL_COLLECTION',
  producer: wine.producer,
  name: wine.name,
  vintage: wine.vintage,
  country: wine.country,
  region: wine.region,
  appellation: wine.appellation,
  wineType: wine.wineType,
  grapes: wine.grapes,
  alcoholPercentage: wine.alcoholPercentage,
  imageUrl: wine.image,
  productNumber: wine.systembolagetProductNumber,
  productUrl: wine.systembolagetUrl,
  referencePrice: wine.referencePrice,
  currency: wine.currency,
  existingWine: wine,
  quantity: wine.quantity,
})

export class LocalCollectionWineSearchProvider implements WineSearchProvider {
  constructor(private readonly getWines: () => WineSummary[]) {}

  async search(query: string): Promise<WineSearchResult[]> {
    const normalized = query.trim().toLocaleLowerCase('sv-SE')
    if (!normalized) return []
    const articleNumber = normalizeEan(normalized)
    return this.getWines()
      .filter((wine) => searchable(wine).includes(normalized)
        || Boolean(articleNumber && wine.systembolagetProductNumber?.replace(/\D/g, '') === articleNumber))
      .map(toResult)
  }

  async getById(id: string): Promise<WineSearchResult | null> {
    const wine = this.getWines().find((item) => item.id === id)
    return wine ? toResult(wine) : null
  }

  async lookupBarcode(): Promise<WineSearchResult[]> {
    // Barcode relations require the proposed wine_barcodes table.
    return []
  }
}
