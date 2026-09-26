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
