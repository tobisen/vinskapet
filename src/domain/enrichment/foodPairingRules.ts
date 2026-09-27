import { matches } from './matching'
import type { EnrichmentContext, RuleResult } from './types'

export function inferFoodPairings(context: EnrichmentContext): RuleResult<string[]> {
  if (matches(context, 'nebbiolo', 'barolo', 'barbaresco')) return { value: ['Nötkött', 'Lamm', 'Vilt', 'Svamp', 'Lagrade ostar'], ruleId: 'NEBBIOLO_FOOD', confidence: 0.94 }
  if (matches(context, 'barbera')) return { value: ['Fläsk', 'Pasta', 'Chark', 'Pizza', 'Grillat'], ruleId: 'BARBERA_FOOD', confidence: 0.94 }
  if (matches(context, 'amarone')) return { value: ['Vilt', 'Långkok', 'Nötkött', 'Lagrade ostar'], ruleId: 'AMARONE_FOOD', confidence: 0.94 }
  if (matches(context, 'chateauneuf-du-pape', 'châteauneuf-du-pape')) return { value: ['Lamm', 'Nötkött', 'Vilt', 'Grillat'], ruleId: 'CHATEAUNEUF_FOOD', confidence: 0.94 }
  if (matches(context, 'etna rosso')) return { value: ['Lamm', 'Fläsk', 'Svamp', 'Grillat'], ruleId: 'ETNA_ROSSO_FOOD', confidence: 0.92 }
  if (matches(context, 'montepulciano')) return { value: ['Pasta', 'Pizza', 'Grillat', 'Chark'], ruleId: 'MONTEPULCIANO_FOOD', confidence: 0.9 }
  if (matches(context, 'etna bianco')) return { value: ['Fisk', 'Skaldjur', 'Kyckling', 'Vegetariskt'], ruleId: 'ETNA_BIANCO_FOOD', confidence: 0.92 }
  if (matches(context, 'riesling')) return { value: ['Fisk', 'Skaldjur', 'Fläsk', 'Kyckling', 'Asiatisk mat'], ruleId: 'RIESLING_FOOD', confidence: 0.92 }
  if (matches(context, 'torrontes', 'torrontés')) return { value: ['Skaldjur', 'Fisk', 'Kyckling', 'Kryddstark mat'], ruleId: 'TORRONTES_FOOD', confidence: 0.92 }
  if (matches(context, 'chardonnay', 'bourgogne blanc', 'bourgogne les')) return { value: ['Fisk', 'Skaldjur', 'Kyckling', 'Svamp'], ruleId: 'CHARDONNAY_FOOD', confidence: 0.9 }
  if (context.wine.wineType === 'ROSE' && matches(context, 'provence')) return { value: ['Fisk', 'Skaldjur', 'Sallader', 'Kyckling'], ruleId: 'PROVENCE_ROSE_FOOD', confidence: 0.93 }
  if (matches(context, 'cremant', 'crémant') || context.wine.wineType?.startsWith('SPARKLING')) return { value: ['Aperitif', 'Skaldjur', 'Fisk', 'Lättare förrätter'], ruleId: 'SPARKLING_FOOD', confidence: 0.88 }
  if (context.wine.wineType === 'RED') return { value: ['Kött', 'Pasta', 'Grillat'], ruleId: 'RED_FOOD', confidence: 0.72 }
  if (context.wine.wineType === 'WHITE') return { value: ['Fisk', 'Skaldjur', 'Kyckling'], ruleId: 'WHITE_FOOD', confidence: 0.72 }
  if (context.wine.wineType === 'ROSE') return { value: ['Fisk', 'Sallader', 'Kyckling'], ruleId: 'ROSE_FOOD', confidence: 0.72 }
  return { value: ['Aperitif'], ruleId: 'GENERIC_FOOD', confidence: 0.66 }
}
