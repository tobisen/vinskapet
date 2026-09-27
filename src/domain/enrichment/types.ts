export type LocalStoragePotential = 'LOW' | 'MEDIUM' | 'HIGH'

export interface LocalWineCandidate {
  source: string
  producer?: string
  name: string
  vintage?: number
  country?: string
  region?: string
  appellation?: string
  wineType?: string
  grapes?: string[]
  storagePotential?: LocalStoragePotential
  drinkingWindowStart?: number
  drinkingWindowEnd?: number
  optimalDrinkingStart?: number
  optimalDrinkingEnd?: number
  servingTemperatureMin?: number
  servingTemperatureMax?: number
  foodPairings?: string[]
  description?: string
}

export interface LocalWineEnrichment {
  grapes?: string[]
  storagePotential?: LocalStoragePotential
  drinkingWindowStart?: number
  drinkingWindowEnd?: number
  optimalDrinkingStart?: number
  optimalDrinkingEnd?: number
  servingTemperatureMin?: number
  servingTemperatureMax?: number
  foodPairings?: string[]
  confidence?: number
  reasoningSummary?: string
  ruleIds?: string[]
}

export interface EnrichmentContext {
  wine: LocalWineCandidate
  text: string
  grapes: string
}

export interface RuleResult<T> {
  value: T
  ruleId: string
  confidence: number
}
