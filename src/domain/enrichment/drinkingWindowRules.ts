import { matches } from './matching'
import type { EnrichmentContext, LocalStoragePotential, RuleResult } from './types'

export type Longevity = 'DRINK_YOUNG' | 'SHORT' | 'MEDIUM' | 'LONG' | 'VERY_LONG'
type Windows = { drinkingStart: number; drinkingEnd: number; optimalStart: number; optimalEnd: number; storage: LocalStoragePotential }

const profiles: Record<Longevity, { start: number; end: number; optimalStart: number; optimalEnd: number; storage: LocalStoragePotential }> = {
  DRINK_YOUNG: { start: 0, end: 3, optimalStart: 0, optimalEnd: 2, storage: 'LOW' },
  SHORT: { start: 0, end: 5, optimalStart: 1, optimalEnd: 4, storage: 'LOW' },
  MEDIUM: { start: 1, end: 8, optimalStart: 2, optimalEnd: 6, storage: 'MEDIUM' },
  LONG: { start: 3, end: 14, optimalStart: 5, optimalEnd: 11, storage: 'HIGH' },
  VERY_LONG: { start: 4, end: 18, optimalStart: 7, optimalEnd: 14, storage: 'HIGH' },
}

export function inferLongevity(context: EnrichmentContext): RuleResult<Longevity> {
  if (matches(context, 'barolo', 'barbaresco')) return { value: 'VERY_LONG', ruleId: 'PIEDMONT_VERY_LONG', confidence: 0.95 }
  if (matches(context, 'amarone', 'chateauneuf-du-pape', 'châteauneuf-du-pape', 'langhe nebbiolo')) return { value: 'LONG', ruleId: 'STRUCTURED_RED_LONG', confidence: 0.92 }
  if (matches(context, 'etna rosso', 'etna bianco', 'barbera', 'bourgogne', 'chardonnay')) return { value: 'MEDIUM', ruleId: 'REGIONAL_MEDIUM', confidence: 0.86 }
  if (matches(context, 'riesling', 'torrontes', 'torrontés')) return { value: 'SHORT', ruleId: 'AROMATIC_WHITE_SHORT', confidence: 0.84 }
  if (context.wine.wineType === 'ROSE') return { value: 'DRINK_YOUNG', ruleId: 'ROSE_DRINK_YOUNG', confidence: 0.9 }
  if (context.wine.wineType?.startsWith('SPARKLING')) return { value: 'SHORT', ruleId: 'SPARKLING_SHORT', confidence: 0.82 }
  if (context.wine.storagePotential === 'HIGH') return { value: 'LONG', ruleId: 'STORAGE_HIGH_LONG', confidence: 0.82 }
  if (context.wine.storagePotential === 'MEDIUM') return { value: 'MEDIUM', ruleId: 'STORAGE_MEDIUM', confidence: 0.82 }
  return { value: 'SHORT', ruleId: 'CONSERVATIVE_SHORT', confidence: 0.7 }
}

function optimalInsideWindow(start: number, end: number, longevity: Longevity): { start: number; end: number } {
  const span = Math.max(0, end - start)
  const startShare = longevity === 'VERY_LONG' ? 0.3 : longevity === 'LONG' ? 0.25 : longevity === 'MEDIUM' ? 0.2 : 0
  const endShare = longevity === 'DRINK_YOUNG' ? 0.25 : 0.15
  const optimalStart = Math.min(end, start + Math.ceil(span * startShare))
  const optimalEnd = Math.max(optimalStart, end - Math.ceil(span * endShare))
  return { start: optimalStart, end: optimalEnd }
}

export function inferWindows(context: EnrichmentContext, referenceYear: number): RuleResult<Windows> {
  const longevity = inferLongevity(context)
  const profile = profiles[longevity.value]
  const baseYear = context.wine.vintage ?? referenceYear
  const drinkingStart = context.wine.drinkingWindowStart ?? Math.max(referenceYear, baseYear + profile.start)
  const drinkingEnd = context.wine.drinkingWindowEnd ?? Math.max(drinkingStart, baseYear + profile.end)
  const optimal = optimalInsideWindow(drinkingStart, drinkingEnd, longevity.value)

  return {
    value: {
      drinkingStart,
      drinkingEnd,
      optimalStart: context.wine.optimalDrinkingStart ?? optimal.start,
      optimalEnd: context.wine.optimalDrinkingEnd ?? optimal.end,
      storage: context.wine.storagePotential ?? profile.storage,
    },
    ruleId: `DRINKING_WINDOW_OPTIMAL_${longevity.value}`,
    confidence: longevity.confidence,
  }
}
