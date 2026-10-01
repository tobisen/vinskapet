import { describe, expect, it } from 'vitest'
import type { WineSummary } from '@/types/domain'
import { parseFoodIntent, WineFoodMatcher } from './foodMatching'

const wine = (overrides: Partial<WineSummary> = {}): WineSummary => ({
  id: overrides.id ?? crypto.randomUUID(), producer: 'Producent', name: 'Vin', wineType: 'RED', grapes: [],
  foodPairings: [], currency: 'SEK', status: 'COLLECTION', createdAt: '', updatedAt: '', quantity: 1,
  storageLocations: [], tastingCount: 0, ...overrides,
})

const matcher = new WineFoodMatcher()
const now = new Date('2026-06-01')

describe('WineFoodMatcher', () => {
  it('normalizes free text into food categories and style attributes', () => {
    expect(parseFoodIntent('grillad entrecôte med bearnaise').tags)
      .toEqual(expect.arrayContaining(['BEEF', 'GRILLED', 'RICH']))
    expect(parseFoodIntent('pasta med svamp och parmesan').categories)
      .toEqual(expect.arrayContaining(['PASTA', 'MUSHROOM', 'CHEESE']))
  })

  it('ranks explicit food metadata ahead of a generic wine-type match', () => {
    const result = matcher.match([
      wine({ id: 'generic', name: 'Generic red', foodPairings: ['Grillat'] }),
      wine({ id: 'specific', name: 'Lamb wine', foodPairings: ['Lamm', 'Grillat'] }),
    ], { text: 'grillat lamm' }, now)
    expect(result.recommendations.map((item) => item.wine.id)).toEqual(['specific', 'generic'])
    expect(result.recommendations[0]?.tier).toBe('BEST_MATCH')
  })

  it('reuses grape and appellation enrichment rules as style matches', () => {
    const result = matcher.match([
      wine({ id: 'nebbiolo', grapes: ['Nebbiolo'], appellation: 'Barolo' }),
      wine({ id: 'white', wineType: 'WHITE', grapes: ['Sauvignon Blanc'] }),
    ], { categories: ['BEEF'] }, now)
    expect(result.recommendations[0]?.wine.id).toBe('nebbiolo')
  })

  it('rewards optimal maturity and penalizes wine that should wait', () => {
    const result = matcher.match([
      wine({ id: 'wait', foodPairings: ['Nötkött'], drinkingWindowStart: 2030, optimalDrinkingStart: 2032 }),
      wine({ id: 'optimal', foodPairings: ['Nötkött'], optimalDrinkingStart: 2025, optimalDrinkingEnd: 2028 }),
    ], { categories: ['BEEF'] }, now)
    expect(result.recommendations.map((item) => item.wine.id)).toEqual(['optimal', 'wait'])
    expect(result.recommendations[1]?.tier).toBe('SAVE_FOR_LATER')
  })

  it('keeps a strong but immature match behind a drinkable alternative', () => {
    const result = matcher.match([
      wine({ id: 'strong-wait', foodPairings: ['Nötkött', 'Grillat', 'Lagrade ostar'], drinkingWindowStart: 2032 }),
      wine({ id: 'ready', foodPairings: ['Nötkött'], drinkingWindowStart: 2024, drinkingWindowEnd: 2030 }),
    ], { text: 'grillad entrecôte med parmesan' }, now)
    expect(result.recommendations[0]?.wine.id).toBe('ready')
    expect(result.recommendations.at(-1)?.tier).toBe('SAVE_FOR_LATER')
  })

  it('does not recommend a poor match and suggests a suitable style', () => {
    const result = matcher.match([
      wine({ wineType: 'RED', foodPairings: ['Nötkött', 'Grillat'] }),
    ], { text: 'ostron och räkor' }, now)
    expect(result.recommendations).toEqual([])
    expect(result.suggestedStyle).toContain('vitt vin')
  })

  it('only considers bottles currently in stock', () => {
    const result = matcher.match([
      wine({ id: 'empty', quantity: 0, foodPairings: ['Lamm'] }),
      wine({ id: 'stock', quantity: 2, foodPairings: ['Lamm'] }),
    ], { categories: ['LAMB'] }, now)
    expect(result.recommendations.map((item) => item.wine.id)).toEqual(['stock'])
  })
})
