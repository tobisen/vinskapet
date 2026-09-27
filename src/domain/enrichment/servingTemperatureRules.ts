import { matches } from './matching'
import type { EnrichmentContext, RuleResult } from './types'

type Temperature = { min: number; max: number }

export function inferServingTemperature(context: EnrichmentContext): RuleResult<Temperature> {
  if (matches(context, 'cremant', 'crémant')) return { value: { min: 6, max: 8 }, ruleId: 'CREMANT_SERVING', confidence: 0.95 }
  if (matches(context, 'nebbiolo', 'barolo', 'barbaresco')) return { value: { min: 16, max: 18 }, ruleId: 'NEBBIOLO_SERVING', confidence: 0.95 }
  if (matches(context, 'amarone')) return { value: { min: 16, max: 18 }, ruleId: 'AMARONE_SERVING', confidence: 0.95 }
  if (matches(context, 'chateauneuf-du-pape', 'châteauneuf-du-pape')) return { value: { min: 16, max: 18 }, ruleId: 'CHATEAUNEUF_SERVING', confidence: 0.95 }
  if (matches(context, 'etna rosso', 'barbera')) return { value: { min: 14, max: 16 }, ruleId: 'LIGHT_ITALIAN_RED_SERVING', confidence: 0.92 }
  if (matches(context, 'riesling', 'torrontes', 'torrontés')) return { value: { min: 8, max: 10 }, ruleId: 'AROMATIC_WHITE_SERVING', confidence: 0.94 }
  if (matches(context, 'etna bianco', 'chardonnay', 'bourgogne blanc', 'bourgogne les')) return { value: { min: 10, max: 12 }, ruleId: 'FULL_WHITE_SERVING', confidence: 0.9 }
  if (context.wine.wineType === 'SPARKLING_WHITE' || context.wine.wineType === 'SPARKLING_ROSE') return { value: { min: 8, max: 10 }, ruleId: 'SPARKLING_SERVING', confidence: 0.85 }
  if (context.wine.wineType === 'ROSE') return { value: { min: 8, max: 12 }, ruleId: 'ROSE_SERVING', confidence: 0.82 }
  if (context.wine.wineType === 'WHITE' || context.wine.wineType === 'ORANGE') return { value: { min: 8, max: 12 }, ruleId: 'WHITE_SERVING', confidence: 0.8 }
  if (context.wine.wineType === 'RED') return { value: { min: 14, max: 17 }, ruleId: 'RED_SERVING', confidence: 0.78 }
  return { value: { min: 10, max: 14 }, ruleId: 'GENERIC_SERVING', confidence: 0.68 }
}
