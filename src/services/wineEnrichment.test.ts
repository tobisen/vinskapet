import { describe, expect, it, vi } from 'vitest'
import type { Wine } from '@/types/domain'
import { enrichWineRecord, wineToEnrichmentCandidate } from '@/services/wineEnrichment'
import { getMissingEnrichmentFields, isWineEnrichment, mergeWineEnrichment } from '@/utils/wineEnrichment'

vi.mock('@/services/supabase', () => ({ supabase: {} }))

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
    expect(isWineEnrichment({ drinkingWindowStart: 2030, optimalDrinkingStart: 2028 })).toBe(false)
    expect(isWineEnrichment({ optimalDrinkingEnd: 2035, drinkingWindowEnd: 2032 })).toBe(false)
    expect(isWineEnrichment({ servingTemperatureMin: 40 })).toBe(false)
    expect(isWineEnrichment({ confidence: 1.1 })).toBe(false)
    expect(isWineEnrichment({ ruleIds: ['BAROLO_GRAPE'] })).toBe(true)
    expect(isWineEnrichment({ ruleIds: ['not a rule'] })).toBe(false)
    expect(isWineEnrichment({ inventedField: 'nope' })).toBe(false)
  })

  it('uses provider provenance when local rules complete metadata', async () => {
    const update = vi.fn(async (updated: Wine) => updated)
    await enrichWineRecord(wine, {
      assessmentSource: 'Local rules',
      enrich: async () => ({ optimalDrinkingStart: 2028, optimalDrinkingEnd: 2032, confidence: 0.9 }),
    }, update)
    expect(update.mock.calls[0]?.[0].assessmentSource).toBe('Local rules')
  })

  it('does not persist a low-confidence assessment', () => {
    const result = mergeWineEnrichment(wine, { optimalDrinkingStart: 2028, confidence: 0.4 }, 'EDGE_AI')
    expect(result.wine).toEqual(wine)
    expect(result.report.completedFields).toEqual([])
    expect(result.report.lowConfidence).toBe(true)
  })

  it('rejects a partial response that conflicts with existing windows', () => {
    const original = structuredClone(wine)
    expect(() => mergeWineEnrichment(wine, { optimalDrinkingStart: 2025 }, 'EDGE_AI')).toThrow('ogiltigt drickfönster')
    expect(wine).toEqual(original)
  })

  it('leaves the Wine intact when the provider fails', async () => {
    const update = vi.fn()
    await expect(enrichWineRecord(wine, { enrich: async () => { throw new Error('provider failed') } }, update)).rejects.toThrow('provider failed')
    expect(update).not.toHaveBeenCalled()
    expect(wine.optimalDrinkingStart).toBeUndefined()
  })

  it('maps all available verified Wine data to the provider candidate', () => {
    expect(wineToEnrichmentCandidate({ ...wine, image: 'https://example.test/wine.png', referencePrice: 349 })).toMatchObject({
      source: 'COLLECTION', producer: 'Prunotto', name: 'Barbaresco', grapes: ['Nebbiolo'],
      imageUrl: 'https://example.test/wine.png', referencePrice: 349, drinkingWindowStart: 2026,
    })
  })
})
