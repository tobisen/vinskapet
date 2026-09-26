import { describe, expect, it } from 'vitest'
import { seedInventory, seedTastings, seedWines } from '@/data/seed'
import type { Inventory, WineFilters } from '@/types/domain'
import {
  buildWineSummaries,
  calculateDrinkingPlan,
  calculateAverageRating,
  calculateBottleCount,
  calculateCollectionValue,
  filterWines,
  getDrinkingStatus,
  getStorageRecommendation,
  groupWinesByCountry,
  groupWinesByDrinkingPeriod,
  groupWinesByType,
  sortWines,
} from './wine'

const barbaresco = seedWines[0]!
const filters: WineFilters = { query: '', wineType: 'ALL', country: '', region: '', vintage: 'ALL', drinkingStatus: 'ALL', storageLocation: 'ALL', availability: 'ALL' }
const summaries = buildWineSummaries(seedWines, seedInventory, seedTastings)

describe('drinking status', () => {
  it('handles each boundary around a drinking window', () => {
    expect(getDrinkingStatus(barbaresco, new Date('2026-06-01'))).toBe('WAIT')
    expect(getDrinkingStatus(barbaresco, new Date('2027-06-01'))).toBe('CAN_DRINK')
    expect(getDrinkingStatus(barbaresco, new Date('2030-06-01'))).toBe('OPTIMAL')
    expect(getDrinkingStatus(barbaresco, new Date('2035-06-01'))).toBe('DRINK_SOON')
    expect(getDrinkingStatus(barbaresco, new Date('2036-06-01'))).toBe('PAST_WINDOW')
  })

  it('turns status into a storage recommendation', () => {
    expect(getStorageRecommendation(barbaresco, new Date('2026-06-01'))).toBe('Bör lagras i vinskåp')
    expect(getStorageRecommendation(barbaresco, new Date('2036-06-01'))).toBe('Ingen längre lagring nödvändig')
  })
})

describe('collection calculations', () => {
  const inventory: Inventory[] = [
    { id: '1', wineId: 'a', quantity: 2, purchasePrice: 100, currency: 'SEK', storageLocation: 'WINE_FRIDGE' },
    { id: '2', wineId: 'b', quantity: 0, purchasePrice: 999, currency: 'SEK', storageLocation: 'OTHER' },
    { id: '3', wineId: 'c', quantity: 1, currency: 'SEK', storageLocation: 'ROOM_STORAGE' },
  ]

  it('counts only actual bottles and values only known purchase prices', () => {
    expect(calculateBottleCount(inventory)).toBe(3)
    expect(calculateCollectionValue(inventory)).toBe(200)
  })

  it('calculates rating while ignoring unrated tastings', () => {
    expect(calculateAverageRating([{ id: '1', wineId: 'a', date: '2025-01-01', rating: 3 }, { id: '2', wineId: 'a', date: '2025-02-01' }, { id: '3', wineId: 'a', date: '2025-03-01', rating: 5 }])).toBe(4)
  })

  it('counts every in-stock bottle once in the drinking plan', () => {
    const inStock = summaries.filter((wine) => wine.quantity > 0)
    const plan = calculateDrinkingPlan(inStock, new Date('2026-06-01'))
    expect(plan.ready + plan.soon + plan.waiting).toBe(inStock.reduce((sum, wine) => sum + wine.quantity, 0))
  })

  it('sums multiple purchase rows for the same wine', () => {
    const summary = buildWineSummaries([barbaresco], [
      { id: 'lot-1', wineId: barbaresco.id, quantity: 2, purchasePrice: 195, currency: 'SEK', storageLocation: 'WINE_FRIDGE' },
      { id: 'lot-2', wineId: barbaresco.id, quantity: 3, purchasePrice: 219, currency: 'SEK', storageLocation: 'WINE_FRIDGE' },
    ], [])[0]!
    expect(summary.quantity).toBe(5)
    expect(summary.averagePrice).toBeCloseTo(209.4)
  })
})

describe('collection discovery', () => {
  it('searches grapes and finds history-only wines', () => {
    expect(filterWines(summaries, { ...filters, query: 'riesling', availability: 'IN_STOCK' }).map((wine) => wine.id)).toContain('history-riesling-2019')
  })

  it('filters zero inventory and wishlist explicitly', () => {
    expect(filterWines(summaries, { ...filters, availability: 'IN_STOCK' }).every((wine) => wine.quantity > 0)).toBe(true)
    expect(filterWines(summaries, { ...filters, availability: 'WISHLIST' }).every((wine) => wine.status === 'WISHLIST')).toBe(true)
  })

  it('sorts by quantity without mutating the source', () => {
    const copy = [...summaries]
    const result = sortWines(copy, 'QUANTITY')
    expect(result[0]!.quantity).toBeGreaterThanOrEqual(result.at(-1)!.quantity)
    expect(copy).toEqual(summaries)
  })

  it('groups by country, type and drinking period', () => {
    expect(groupWinesByCountry(summaries).size).toBeGreaterThan(3)
    expect(groupWinesByType(summaries).get('Rött')?.length).toBeGreaterThan(0)
    expect(groupWinesByDrinkingPeriod(summaries).has('Drick nu')).toBe(true)
  })
})
