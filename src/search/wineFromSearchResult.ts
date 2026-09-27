import type { Wine, WineType } from '@/types/domain'
import type { WineSearchResult } from '@/types/search'

export function wineFromSearchResult(result: WineSearchResult, vintage = result.vintage, wineType: WineType | undefined = result.wineType): Wine {
  if (!result.producer?.trim() || !wineType) throw new Error('Wine result lacks required metadata')
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    producer: result.producer.trim(),
    name: result.name.trim(),
    vintage,
    country: result.country,
    region: result.region,
    appellation: result.appellation,
    wineType,
    grapes: result.grapes ?? [],
    alcoholPercentage: result.alcoholPercentage,
    image: result.imageUrl,
    systembolagetProductNumber: result.productNumber,
    systembolagetUrl: result.productUrl,
    referencePrice: result.referencePrice,
    currency: result.currency ?? 'SEK',
    servingTemperatureMin: result.servingTemperatureMin,
    servingTemperatureMax: result.servingTemperatureMax,
    foodPairings: result.foodPairings ?? [],
    description: result.description,
    status: 'COLLECTION',
    createdAt: now,
    updatedAt: now,
  }
}
