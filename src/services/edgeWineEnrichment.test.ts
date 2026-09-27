import { describe, expect, it } from 'vitest'
import { isWineCandidate, isWineEnrichment } from '../../supabase/functions/_shared/wine-enrichment'
import { getWineEnrichmentProvider, ProviderNotConfiguredError } from '../../supabase/functions/enrich-wine/providers/provider'

describe('enrich-wine Edge Function contract', () => {
  it('accepts a verified candidate and a bounded structured response', () => {
    expect(isWineCandidate({ source: 'COLLECTION', producer: 'Prunotto', name: 'Barbaresco', vintage: 2020 })).toBe(true)
    expect(isWineEnrichment({
      storagePotential: 'HIGH', drinkingWindowStart: 2026, drinkingWindowEnd: 2035,
      optimalDrinkingStart: 2029, optimalDrinkingEnd: 2033, servingTemperatureMin: 16,
      servingTemperatureMax: 18, foodPairings: ['Lamm', 'Svamp'], confidence: 0.86,
      reasoningSummary: 'Bedömning utifrån producent, appellation och årgång.',
      ruleIds: ['NEBBIOLO_SERVING'],
    })).toBe(true)
  })

  it('rejects unknown fields and invalid nested windows', () => {
    expect(isWineCandidate({ source: 'COLLECTION', name: '' })).toBe(false)
    expect(isWineEnrichment({ drinkingWindowStart: 2030, optimalDrinkingStart: 2028 })).toBe(false)
    expect(isWineEnrichment({ confidence: -0.1 })).toBe(false)
    expect(isWineEnrichment({ rawProviderOutput: 'no' })).toBe(false)
  })

  it('uses local rules by default and keeps disabled mode available', async () => {
    const provider = getWineEnrichmentProvider()
    const enrichment = await provider.enrich({ source: 'COLLECTION', name: 'Barolo', wineType: 'RED', vintage: 2021 })
    expect(enrichment.grapes).toEqual(['Nebbiolo'])
    expect(enrichment.ruleIds).toContain('NEBBIOLO_SERVING')
    expect(() => getWineEnrichmentProvider('disabled')).toThrow(ProviderNotConfiguredError)
  })
})
