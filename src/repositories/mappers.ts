import type { InventoryInsert, InventoryRow, TastingInsert, TastingRow, WineInsert, WineRow } from '@/types/database'
import type { Inventory, InventoryInput, Tasting, Wine } from '@/types/domain'

const optional = <T>(value: T | null): T | undefined => value ?? undefined

export function wineRowToDomain(row: WineRow): Wine {
  return {
    id: row.id,
    producer: row.producer,
    name: row.name,
    vintage: optional(row.vintage),
    country: optional(row.country),
    region: optional(row.region),
    appellation: optional(row.appellation),
    wineType: row.wine_type,
    grapes: row.grapes ?? [],
    alcoholPercentage: optional(row.alcohol_percentage),
    image: optional(row.image_url),
    systembolagetProductNumber: optional(row.systembolaget_product_number),
    systembolagetUrl: optional(row.systembolaget_url),
    referencePrice: optional(row.reference_price),
    currency: row.currency,
    storagePotential: optional(row.storage_potential),
    drinkingWindowStart: optional(row.drinking_window_start),
    drinkingWindowEnd: optional(row.drinking_window_end),
    optimalDrinkingStart: optional(row.optimal_drinking_start),
    optimalDrinkingEnd: optional(row.optimal_drinking_end),
    servingTemperatureMin: optional(row.serving_temperature_min),
    servingTemperatureMax: optional(row.serving_temperature_max),
    foodPairings: row.food_pairings ?? [],
    description: optional(row.description),
    notes: optional(row.notes),
    assessmentSource: optional(row.assessment_source),
    assessmentUpdatedAt: optional(row.assessment_updated_at),
    wishlistQuantity: row.wishlist_quantity ?? 1,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function wineToInsert(wine: Wine, userId: string): WineInsert {
  return {
    id: wine.id,
    user_id: userId,
    producer: wine.producer,
    name: wine.name,
    vintage: wine.vintage ?? null,
    country: wine.country ?? null,
    region: wine.region ?? null,
    appellation: wine.appellation ?? null,
    wine_type: wine.wineType,
    grapes: wine.grapes,
    alcohol_percentage: wine.alcoholPercentage ?? null,
    image_url: wine.image ?? null,
    systembolaget_product_number: wine.systembolagetProductNumber ?? null,
    systembolaget_url: wine.systembolagetUrl ?? null,
    reference_price: wine.referencePrice ?? null,
    currency: wine.currency,
    storage_potential: wine.storagePotential ?? null,
    drinking_window_start: wine.drinkingWindowStart ?? null,
    drinking_window_end: wine.drinkingWindowEnd ?? null,
    optimal_drinking_start: wine.optimalDrinkingStart ?? null,
    optimal_drinking_end: wine.optimalDrinkingEnd ?? null,
    serving_temperature_min: wine.servingTemperatureMin ?? null,
    serving_temperature_max: wine.servingTemperatureMax ?? null,
    food_pairings: wine.foodPairings,
    description: wine.description ?? null,
    notes: wine.notes ?? null,
    assessment_source: wine.assessmentSource ?? null,
    assessment_updated_at: wine.assessmentUpdatedAt ?? null,
    wishlist_quantity: Math.max(1, wine.wishlistQuantity ?? 1),
    status: wine.status,
    created_at: wine.createdAt,
    updated_at: wine.updatedAt,
  }
}

export function wineToUpdate(wine: Wine): Partial<WineInsert> {
  const values: Partial<WineInsert> = wineToInsert(wine, '')
  delete values.user_id
  delete values.id
  delete values.created_at
  return values
}

export function inventoryRowToDomain(row: InventoryRow): Inventory {
  return {
    id: row.id,
    wineId: row.wine_id,
    quantity: row.quantity,
    purchasePrice: optional(row.purchase_price),
    currency: row.currency,
    purchaseDate: optional(row.purchase_date),
    purchaseLocation: optional(row.purchase_location),
    storageLocation: row.storage_location,
    notes: optional(row.notes),
  }
}

export function inventoryToInsert(wineId: string, input: InventoryInput, userId: string): InventoryInsert {
  return {
    user_id: userId,
    wine_id: wineId,
    quantity: input.quantity,
    purchase_price: input.purchasePrice ?? null,
    currency: 'SEK',
    purchase_date: input.purchaseDate ?? null,
    purchase_location: input.purchaseLocation ?? null,
    storage_location: input.storageLocation,
    notes: input.notes ?? null,
  }
}

export function tastingRowToDomain(row: TastingRow): Tasting {
  const rating = row.rating && row.rating >= 1 && row.rating <= 5
    ? row.rating as Tasting['rating']
    : undefined
  return {
    id: row.id,
    wineId: row.wine_id,
    date: row.tasted_at,
    rating,
    review: optional(row.review),
    occasion: optional(row.occasion),
    food: optional(row.food),
    maturityAssessment: optional(row.maturity_assessment),
    buyAgain: optional(row.buy_again),
    notes: optional(row.notes),
  }
}

export function tastingToInsert(tasting: Omit<Tasting, 'id'> & { id?: string }, userId: string): TastingInsert {
  const values: TastingInsert = {
    user_id: userId,
    wine_id: tasting.wineId,
    tasted_at: tasting.date,
    rating: tasting.rating ?? null,
    review: tasting.review ?? null,
    occasion: tasting.occasion ?? null,
    food: tasting.food ?? null,
    maturity_assessment: tasting.maturityAssessment ?? null,
    buy_again: tasting.buyAgain ?? null,
    notes: tasting.notes ?? null,
  }
  if (tasting.id) values.id = tasting.id
  return values
}
