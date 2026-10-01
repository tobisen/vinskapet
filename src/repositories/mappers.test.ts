import { describe, expect, it } from 'vitest'
import type { InventoryRow, TastingRow, WineRow } from '@/types/database'
import type { Wine } from '@/types/domain'
import {
  inventoryRowToDomain,
  inventoryToInsert,
  tastingRowToDomain,
  tastingToInsert,
  wineRowToDomain,
  wineToInsert,
} from './mappers'

const wineRow: WineRow = {
  id: '2cfb1428-3ed0-45f4-b772-814a5405ac9d', user_id: 'user-1', producer: 'Prunotto', name: 'Barbaresco',
  vintage: 2020, country: 'Italien', region: 'Piemonte', appellation: 'Barbaresco DOCG', wine_type: 'RED',
  grapes: ['Nebbiolo'], alcohol_percentage: 14, image_url: null, systembolaget_product_number: null,
  systembolaget_url: null, reference_price: 349, currency: 'SEK', storage_potential: 'HIGH',
  drinking_window_start: 2027, drinking_window_end: 2035, optimal_drinking_start: 2029,
  optimal_drinking_end: 2033, serving_temperature_min: 16, serving_temperature_max: 18,
  food_pairings: ['Vilt'], description: 'Nyanserat.', notes: null, assessment_source: null,
  assessment_updated_at: null, wishlist_quantity: 1, status: 'COLLECTION', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
}

describe('database mappers', () => {
  it('maps a wine row to the camelCase domain model', () => {
    const wine = wineRowToDomain(wineRow)
    expect(wine).toMatchObject({ wineType: 'RED', referencePrice: 349, drinkingWindowStart: 2027, foodPairings: ['Vilt'] })
    expect(wine.image).toBeUndefined()
  })

  it('maps a domain wine to a snake_case insert with user ownership', () => {
    const domain = wineRowToDomain(wineRow)
    domain.wishlistQuantity = 3
    const insert = wineToInsert(domain, 'auth-user')
    expect(insert).toMatchObject({ user_id: 'auth-user', wine_type: 'RED', reference_price: 349, drinking_window_end: 2035, wishlist_quantity: 3 })
  })

  it('maps inventory in both directions', () => {
    const row: InventoryRow = {
      id: 'inventory-1', user_id: 'user-1', wine_id: wineRow.id, quantity: 3, purchase_price: 219,
      currency: 'SEK', purchase_date: '2026-02-01', purchase_location: 'Systembolaget', storage_location: 'WINE_FRIDGE',
      notes: null, created_at: '2026-02-01T12:00:00Z', updated_at: '2026-02-01T12:00:00Z',
    }
    expect(inventoryRowToDomain(row)).toMatchObject({ wineId: wineRow.id, purchasePrice: 219, storageLocation: 'WINE_FRIDGE' })
    expect(inventoryToInsert(wineRow.id, { quantity: 2, purchasePrice: 195, storageLocation: 'OTHER' }, 'auth-user'))
      .toMatchObject({ user_id: 'auth-user', wine_id: wineRow.id, purchase_price: 195, storage_location: 'OTHER' })
  })

  it('maps tastings and optional values', () => {
    const row: TastingRow = {
      id: 'tasting-1', user_id: 'user-1', wine_id: wineRow.id, tasted_at: '2026-03-01', rating: 5,
      review: 'Stor upplevelse.', occasion: null, food: null, maturity_assessment: 'PERFECT', buy_again: 'YES', notes: null,
      created_at: '2026-03-01T20:00:00Z', updated_at: '2026-03-01T20:00:00Z',
    }
    expect(tastingRowToDomain(row)).toMatchObject({ date: '2026-03-01', rating: 5, maturityAssessment: 'PERFECT', buyAgain: 'YES' })
    expect(tastingToInsert({ wineId: wineRow.id, date: '2026-03-01', rating: 5 }, 'auth-user'))
      .toMatchObject({ user_id: 'auth-user', wine_id: wineRow.id, tasted_at: '2026-03-01', rating: 5 })
  })

  it('round-trips required wine fields', () => {
    const domain: Wine = wineRowToDomain(wineRow)
    const restored = wineRowToDomain({ ...wineRow, ...wineToInsert(domain, wineRow.user_id), id: wineRow.id, created_at: wineRow.created_at, updated_at: wineRow.updated_at })
    expect(restored).toEqual(domain)
  })
})
