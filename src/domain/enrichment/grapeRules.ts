import { hasText } from './matching'
import type { EnrichmentContext, RuleResult } from './types'

export function inferGrapes(context: EnrichmentContext): RuleResult<string[]> | undefined {
  if (context.wine.grapes?.length) return undefined
  if (hasText(context, 'Barolo', 'Barbaresco', 'Langhe Nebbiolo')) return { value: ['Nebbiolo'], ruleId: 'NEBBIOLO_APPELLATION_GRAPE', confidence: 0.98 }
  if (hasText(context, "Barbera d'Alba", 'Barbera d’Alba', 'Barbera')) return { value: ['Barbera'], ruleId: 'BARBERA_NAME_GRAPE', confidence: 0.98 }
  if (hasText(context, 'Chablis')) return { value: ['Chardonnay'], ruleId: 'CHABLIS_GRAPE', confidence: 0.98 }
  if (hasText(context, 'Riesling')) return { value: ['Riesling'], ruleId: 'RIESLING_NAME_GRAPE', confidence: 0.98 }
  if (hasText(context, 'Torrontes', 'Torrontés')) return { value: ['Torrontés'], ruleId: 'TORRONTES_NAME_GRAPE', confidence: 0.98 }
  if (hasText(context, 'Chardonnay')) return { value: ['Chardonnay'], ruleId: 'CHARDONNAY_NAME_GRAPE', confidence: 0.98 }
  return undefined
}
