import { describe, expect, it } from 'vitest'
import type { WineSummary } from '@/types/domain'
import { buildDrinkingRecommendations, classifyWineForDrinking, countDrinkingBottles } from './drinking'

const wine = (overrides: Partial<WineSummary> = {}): WineSummary => ({
  id: overrides.id ?? crypto.randomUUID(),
  producer: 'Producent',
  name: 'Vin',
  wineType: 'RED',
  grapes: [],
  foodPairings: [],
  currency: 'SEK',
  status: 'COLLECTION',
  createdAt: '',
  updatedAt: '',
  quantity: 1,
  storageLocations: [],
  tastingCount: 0,
  ...overrides,
})

const now = new Date('2026-06-01')

describe('drinking recommendations', () => {
  it.each([
    [{ drinkingWindowEnd: 2027 }, 'DRINK_SOON'],
    [{ drinkingWindowStart: 2024, drinkingWindowEnd: 2030, optimalDrinkingStart: 2026, optimalDrinkingEnd: 2028 }, 'DRINK_NOW'],
    [{ drinkingWindowStart: 2025, drinkingWindowEnd: 2032, optimalDrinkingStart: 2029 }, 'CAN_DRINK'],
    [{ drinkingWindowStart: 2029, drinkingWindowEnd: 2035 }, 'WAIT'],
    [{ vintage: 2020, storagePotential: 'HIGH' }, 'UNKNOWN'],
  ] as const)('classifies %o as %s', (metadata, classification) => {
    expect(classifyWineForDrinking(wine(metadata), now).classification).toBe(classification)
  })

  it('uses concise explanations from the known windows', () => {
    expect(classifyWineForDrinking(wine({ optimalDrinkingStart: 2026, optimalDrinkingEnd: 2029 }), now).explanation)
      .toBe('Optimal period 2026–2029')
    expect(classifyWineForDrinking(wine({ optimalDrinkingStart: 2029 }), now).explanation)
      .toBe('Optimal från 2029')
    expect(classifyWineForDrinking(wine({ drinkingWindowEnd: 2027 }), now).explanation)
      .toBe('Drickfönstret närmar sig slutet')
  })

  it('ignores empty inventory and sorts the most urgent bottles first', () => {
    const recommendations = buildDrinkingRecommendations([
      wine({ id: 'wait', name: 'Wait', drinkingWindowStart: 2030 }),
      wine({ id: 'later', name: 'Later', drinkingWindowEnd: 2027 }),
      wine({ id: 'overdue', name: 'Overdue', drinkingWindowEnd: 2025 }),
      wine({ id: 'empty', name: 'Empty', quantity: 0, drinkingWindowEnd: 2024 }),
      wine({ id: 'now', name: 'Now', optimalDrinkingStart: 2025, optimalDrinkingEnd: 2028 }),
    ], now)

    expect(recommendations.map((item) => item.wine.id)).toEqual(['overdue', 'later', 'now', 'wait'])
  })

  it('counts bottles rather than wine records', () => {
    const recommendations = buildDrinkingRecommendations([
      wine({ quantity: 2, drinkingWindowEnd: 2027 }),
      wine({ quantity: 3, optimalDrinkingStart: 2025, optimalDrinkingEnd: 2028 }),
    ], now)
    expect(countDrinkingBottles(recommendations)).toMatchObject({ DRINK_SOON: 2, DRINK_NOW: 3 })
  })
})
