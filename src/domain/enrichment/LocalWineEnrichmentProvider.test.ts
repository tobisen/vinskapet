import { describe, expect, it } from 'vitest'
import { LocalWineEnrichmentProvider } from './LocalWineEnrichmentProvider'
import type { LocalWineCandidate } from './types'

const provider = new LocalWineEnrichmentProvider(2026)
const candidate = (overrides: Partial<LocalWineCandidate>): LocalWineCandidate => ({
  source: 'COLLECTION', name: 'Testvin', wineType: 'RED', vintage: 2022, ...overrides,
})

describe('LocalWineEnrichmentProvider', () => {
  it.each([
    ['Barbaresco', { name: 'Barbaresco', appellation: 'Barbaresco' }, ['Nebbiolo'], [16, 18], 'NEBBIOLO_FOOD'],
    ['Barolo', { name: 'Barolo Serralunga d’Alba', appellation: 'Barolo' }, ['Nebbiolo'], [16, 18], 'NEBBIOLO_FOOD'],
    ['Châteauneuf-du-Pape', { name: 'Châteauneuf-du-Pape', appellation: 'Châteauneuf-du-Pape' }, undefined, [16, 18], 'CHATEAUNEUF_FOOD'],
    ['Amarone', { name: 'Amarone Classico', appellation: 'Amarone della Valpolicella' }, undefined, [16, 18], 'AMARONE_FOOD'],
    ['Etna Rosso', { name: 'DeAetna Rosso', appellation: 'Etna Rosso' }, undefined, [14, 16], 'ETNA_ROSSO_FOOD'],
    ["Barbera d'Alba", { name: 'Busije', appellation: "Barbera d'Alba" }, ['Barbera'], [14, 16], 'BARBERA_FOOD'],
    ["Montepulciano d'Abruzzo", { name: "Montepulciano d'Abruzzo", appellation: "Montepulciano d'Abruzzo" }, undefined, [14, 17], 'MONTEPULCIANO_FOOD'],
    ['Langhe Nebbiolo', { name: 'Langhe Nebbiolo A Mont', appellation: 'Langhe Nebbiolo' }, ['Nebbiolo'], [16, 18], 'NEBBIOLO_FOOD'],
    ['Etna Bianco', { name: 'Etna Bianco', appellation: 'Etna Bianco', wineType: 'WHITE' }, undefined, [10, 12], 'ETNA_BIANCO_FOOD'],
    ['Riesling Trocken', { name: 'Riesling Trocken', wineType: 'WHITE' }, ['Riesling'], [8, 10], 'RIESLING_FOOD'],
    ['Torrontés', { name: 'Barrel Fermented Torrontés', wineType: 'WHITE' }, ['Torrontés'], [8, 10], 'TORRONTES_FOOD'],
    ['Bourgogne Chardonnay', { name: 'Bourgogne Les Murelles', wineType: 'WHITE', grapes: ['Chardonnay'] }, undefined, [10, 12], 'CHARDONNAY_FOOD'],
    ['Provence Rosé', { name: 'Whispering Angel', region: 'Provence', wineType: 'ROSE' }, undefined, [8, 12], 'PROVENCE_ROSE_FOOD'],
    ['Crémant', { name: 'Crémant de Loire', wineType: 'SPARKLING_WHITE' }, undefined, [6, 8], 'SPARKLING_FOOD'],
  ])('applies specific rules for %s', async (_label, input, expectedGrapes, temperature, foodRule) => {
    const result = await provider.enrich(candidate(input))
    if (expectedGrapes) expect(result.grapes).toEqual(expectedGrapes)
    else expect(result.grapes).toBeUndefined()
    expect([result.servingTemperatureMin, result.servingTemperatureMax]).toEqual(temperature)
    expect(result.ruleIds).toContain(foodRule)
    expect(result.foodPairings?.length).toBeGreaterThan(2)
  })

  it('preserves manual, Systembolaget and imported values by returning only missing fields', async () => {
    const result = await provider.enrich(candidate({
      name: 'Barolo', appellation: 'Barolo', grapes: ['Manuell druva'], storagePotential: 'LOW',
      drinkingWindowStart: 2025, drinkingWindowEnd: 2030, optimalDrinkingStart: 2026,
      optimalDrinkingEnd: 2029, servingTemperatureMin: 12, servingTemperatureMax: 13,
      foodPairings: ['Systembolaget-matchning'], description: 'Verifierad beskrivning.',
    }))

    expect(result).toEqual({})
  })

  it('places an inferred optimal period inside the documented drinking window', async () => {
    const result = await provider.enrich(candidate({
      name: 'Barbaresco', drinkingWindowStart: 2026, drinkingWindowEnd: 2035,
      storagePotential: 'HIGH', grapes: ['Nebbiolo'], foodPairings: ['Vilt'],
      servingTemperatureMin: 16, servingTemperatureMax: 18,
    }))
    expect(result.optimalDrinkingStart).toBeGreaterThanOrEqual(2026)
    expect(result.optimalDrinkingEnd).toBeLessThanOrEqual(2035)
    expect(result.optimalDrinkingStart).toBeLessThanOrEqual(result.optimalDrinkingEnd!)
    expect(result.ruleIds).toContain('DRINKING_WINDOW_OPTIMAL_VERY_LONG')
  })

  it('leaves uncertain grapes empty and never fabricates a description', async () => {
    const result = await provider.enrich(candidate({ name: 'Cuvée Céleste', wineType: 'SPARKLING_WHITE' }))
    expect(result.grapes).toBeUndefined()
    expect('description' in result).toBe(false)
  })

  it('creates broad conservative windows when no documented window exists', async () => {
    const result = await provider.enrich(candidate({ name: 'Barolo', appellation: 'Barolo', vintage: 2021 }))
    expect(result.drinkingWindowStart).toBe(2026)
    expect(result.drinkingWindowEnd).toBe(2039)
    expect(result.optimalDrinkingStart).toBeGreaterThanOrEqual(result.drinkingWindowStart!)
    expect(result.optimalDrinkingEnd).toBeLessThanOrEqual(result.drinkingWindowEnd!)
    expect(result.storagePotential).toBe('HIGH')
  })
})
