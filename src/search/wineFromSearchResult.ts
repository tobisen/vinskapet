import type { Wine, WineStatus, WineType } from '@/types/domain'
import type { WineSearchResult } from '@/types/search'

export function wineFromSearchResult(
  result: WineSearchResult,
  vintage: number | null | undefined = result.vintage,
  wineType: WineType | undefined = result.wineType,
  status: WineStatus = 'COLLECTION',
): Wine {
  if (!result.producer?.trim() || !wineType) throw new Error('Wine result lacks required metadata')
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    producer: result.producer.trim(),
    name: result.name.trim(),
    vintage: vintage ?? undefined,
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
    storagePotential: result.storagePotential,
    drinkingWindowStart: result.drinkingWindowStart,
    drinkingWindowEnd: result.drinkingWindowEnd,
    optimalDrinkingStart: result.optimalDrinkingStart,
    optimalDrinkingEnd: result.optimalDrinkingEnd,
    servingTemperatureMin: result.servingTemperatureMin,
    servingTemperatureMax: result.servingTemperatureMax,
    foodPairings: result.foodPairings ?? [],
    description: result.description,
    wishlistQuantity: 1,
    status,
    createdAt: now,
    updatedAt: now,
  }
}
