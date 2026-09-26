import { describe, expect, it } from 'vitest'
import type { Wine } from '@/types/domain'
import { getMissingEnrichmentFields, isWineEnrichment, mergeWineEnrichment } from '@/utils/wineEnrichment'

const wine: Wine = {
  id: 'wine-1', producer: 'Prunotto', name: 'Barbaresco', vintage: 2020,
  wineType: 'RED', grapes: ['Nebbiolo'], currency: 'SEK', storagePotential: 'HIGH',
  drinkingWindowStart: 2026, drinkingWindowEnd: 2033, foodPairings: [],
  status: 'COLLECTION', createdAt: '2026-01-01', updatedAt: '2026-01-01',
}

describe('wine enrichment', () => {
  it('only fills missing fields and reports before and after', () => {
    const result = mergeWineEnrichment(wine, {
      grapes: ['Wrong grape'],
      storagePotential: 'LOW',
      optimalDrinkingStart: 2028,
      optimalDrinkingEnd: 2032,
      servingTemperatureMin: 16,
      servingTemperatureMax: 18,
      foodPairings: ['Nötkött', 'Svamp'],
      description: 'Stramt och nyanserat.',
    }, 'EDGE_AI', '2026-09-26T12:00:00.000Z')

    expect(result.wine.grapes).toEqual(['Nebbiolo'])
    expect(result.wine.storagePotential).toBe('HIGH')
    expect(result.wine.optimalDrinkingStart).toBe(2028)
    expect(result.wine.foodPairings).toEqual(['Nötkött', 'Svamp'])
    expect(result.report.completedFields).toEqual([
      'optimalDrinkingStart', 'optimalDrinkingEnd', 'servingTemperatureMin',
      'servingTemperatureMax', 'foodPairings', 'description',
    ])
    expect(result.report.missingAfter).toEqual([])
  })

  it('treats empty arrays as missing metadata', () => {
    expect(getMissingEnrichmentFields(wine)).toContain('foodPairings')
    expect(getMissingEnrichmentFields(wine)).not.toContain('grapes')
  })

  it('rejects malformed or unreasonable provider responses', () => {
    expect(isWineEnrichment({ grapes: ['Nebbiolo'], servingTemperatureMin: 16, servingTemperatureMax: 18 })).toBe(true)
    expect(isWineEnrichment({ grapes: 'Nebbiolo' })).toBe(false)
    expect(isWineEnrichment({ storagePotential: 'FOREVER' })).toBe(false)
    expect(isWineEnrichment({ optimalDrinkingStart: 2032, optimalDrinkingEnd: 2028 })).toBe(false)
    expect(isWineEnrichment({ servingTemperatureMin: 40 })).toBe(false)
    expect(isWineEnrichment({ inventedField: 'nope' })).toBe(false)
  })
})
