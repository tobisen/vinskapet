import { inferWindows } from './drinkingWindowRules'
import { inferFoodPairings } from './foodPairingRules'
import { inferGrapes } from './grapeRules'
import { createEnrichmentContext } from './matching'
import { inferServingTemperature } from './servingTemperatureRules'
import type { LocalWineCandidate, LocalWineEnrichment } from './types'

const missing = (value: unknown): boolean => value == null || value === '' || (Array.isArray(value) && value.length === 0)

export class LocalWineEnrichmentProvider {
  readonly assessmentSource = 'Local rules'

  constructor(private readonly referenceYear = new Date().getFullYear()) {}

  async enrich(wine: LocalWineCandidate): Promise<LocalWineEnrichment> {
    const context = createEnrichmentContext(wine)
    const grapes = inferGrapes(context)
    const serving = inferServingTemperature(context)
    const food = inferFoodPairings(context)
    const windows = inferWindows(context, this.referenceYear)
    const enrichment: LocalWineEnrichment = {}
    const applied: Array<{ ruleId: string; confidence: number }> = []

    if (grapes && missing(wine.grapes)) {
      enrichment.grapes = grapes.value
      applied.push(grapes)
    }
    if (missing(wine.servingTemperatureMin)) enrichment.servingTemperatureMin = serving.value.min
    if (missing(wine.servingTemperatureMax)) enrichment.servingTemperatureMax = serving.value.max
    if (missing(wine.servingTemperatureMin) || missing(wine.servingTemperatureMax)) applied.push(serving)
    if (missing(wine.foodPairings)) {
      enrichment.foodPairings = food.value
      applied.push(food)
    }
    if (missing(wine.storagePotential)) enrichment.storagePotential = windows.value.storage
    if (missing(wine.drinkingWindowStart)) enrichment.drinkingWindowStart = windows.value.drinkingStart
    if (missing(wine.drinkingWindowEnd)) enrichment.drinkingWindowEnd = windows.value.drinkingEnd
    if (missing(wine.optimalDrinkingStart)) enrichment.optimalDrinkingStart = windows.value.optimalStart
    if (missing(wine.optimalDrinkingEnd)) enrichment.optimalDrinkingEnd = windows.value.optimalEnd
    if ([wine.storagePotential, wine.drinkingWindowStart, wine.drinkingWindowEnd, wine.optimalDrinkingStart, wine.optimalDrinkingEnd].some(missing)) applied.push(windows)

    const uniqueRules = [...new Set(applied.map(({ ruleId }) => ruleId))]
    if (uniqueRules.length) {
      enrichment.confidence = Math.min(...applied.map(({ confidence }) => confidence))
      enrichment.ruleIds = uniqueRules
      enrichment.reasoningSummary = uniqueRules.join(', ')
    }
    return enrichment
  }
}
