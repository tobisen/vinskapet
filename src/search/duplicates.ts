import type { InventoryInput, Wine } from '@/types/domain'
import type { WineCandidate } from '@/types/search'

const normalized = (value?: string): string => value?.trim().toLocaleLowerCase('sv-SE') ?? ''

export function findDuplicateWine(candidate: WineCandidate, wines: Wine[]): Wine | undefined {
  if (candidate.source === 'LOCAL_COLLECTION' && candidate.externalId) {
    const internal = wines.find((wine) => wine.id === candidate.externalId)
    if (internal) return internal
  }

  if (candidate.productNumber) {
    const productNumber = candidate.productNumber.replace(/\D/g, '')
    const productMatch = wines.find((wine) => wine.systembolagetProductNumber?.replace(/\D/g, '') === productNumber)
    if (productMatch) return productMatch
  }

  return wines.find((wine) => normalized(wine.producer) === normalized(candidate.producer)
    && normalized(wine.name) === normalized(candidate.name)
    && wine.vintage === candidate.vintage)
}

export async function saveWinePurchase(
  wine: Wine,
  inventory: InventoryInput,
  existingWine: Wine | undefined,
  actions: {
    createWine: (wine: Wine, inventory: InventoryInput) => Promise<boolean>
    addInventory: (wineId: string, inventory: InventoryInput) => Promise<boolean>
  },
): Promise<{ saved: boolean; wineId: string }> {
  if (existingWine) {
    return { saved: await actions.addInventory(existingWine.id, inventory), wineId: existingWine.id }
  }
  return { saved: await actions.createWine(wine, inventory), wineId: wine.id }
}

export async function saveWineToWishlist(
  wine: Wine,
  existingWine: Wine | undefined,
  actions: {
    createWine: (wine: Wine) => Promise<boolean>
    updateWine: (wine: Wine) => Promise<boolean>
  },
): Promise<{ saved: boolean; wineId: string; created: boolean; reason?: 'IN_COLLECTION' }> {
  if (!existingWine) {
    return { saved: await actions.createWine({ ...wine, status: 'WISHLIST' }), wineId: wine.id, created: true }
  }

  if (existingWine.status === 'COLLECTION') {
    return { saved: false, wineId: existingWine.id, created: false, reason: 'IN_COLLECTION' }
  }

  const updated: Wine = {
    ...existingWine,
    country: existingWine.country ?? wine.country,
    region: existingWine.region ?? wine.region,
    appellation: existingWine.appellation ?? wine.appellation,
    alcoholPercentage: existingWine.alcoholPercentage ?? wine.alcoholPercentage,
    image: existingWine.image ?? wine.image,
    systembolagetProductNumber: existingWine.systembolagetProductNumber ?? wine.systembolagetProductNumber,
    systembolagetUrl: existingWine.systembolagetUrl ?? wine.systembolagetUrl,
    referencePrice: existingWine.referencePrice ?? wine.referencePrice,
    grapes: existingWine.grapes.length ? existingWine.grapes : wine.grapes,
    storagePotential: existingWine.storagePotential ?? wine.storagePotential,
    drinkingWindowStart: existingWine.drinkingWindowStart ?? wine.drinkingWindowStart,
    drinkingWindowEnd: existingWine.drinkingWindowEnd ?? wine.drinkingWindowEnd,
    optimalDrinkingStart: existingWine.optimalDrinkingStart ?? wine.optimalDrinkingStart,
    optimalDrinkingEnd: existingWine.optimalDrinkingEnd ?? wine.optimalDrinkingEnd,
    servingTemperatureMin: existingWine.servingTemperatureMin ?? wine.servingTemperatureMin,
    servingTemperatureMax: existingWine.servingTemperatureMax ?? wine.servingTemperatureMax,
    foodPairings: existingWine.foodPairings.length ? existingWine.foodPairings : wine.foodPairings,
    description: existingWine.description ?? wine.description,
    wishlistQuantity: wine.wishlistQuantity ?? existingWine.wishlistQuantity ?? 1,
    status: 'WISHLIST',
    updatedAt: new Date().toISOString(),
  }
  return { saved: await actions.updateWine(updated), wineId: existingWine.id, created: false }
}
