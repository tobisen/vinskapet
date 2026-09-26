import type { Wine } from '@/types/domain'
import type { WineEnrichment, WineEnrichmentField, WineEnrichmentReport } from '@/types/search'

export const enrichmentFields: WineEnrichmentField[] = [
  'grapes',
  'storagePotential',
  'drinkingWindowStart',
  'drinkingWindowEnd',
  'optimalDrinkingStart',
  'optimalDrinkingEnd',
  'servingTemperatureMin',
  'servingTemperatureMax',
  'foodPairings',
  'description',
]

const isMissing = (value: unknown): boolean => value == null || value === '' || (Array.isArray(value) && value.length === 0)
const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.trim().length > 0)
const isYear = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 1900 && Number(value) <= 2200
const isTemperature = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 30

export function isWineEnrichment(value: unknown): value is WineEnrichment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  if (!Object.keys(record).every((key) => enrichmentFields.includes(key as WineEnrichmentField))) return false

  for (const [field, fieldValue] of Object.entries(record)) {
    if (fieldValue == null) continue
    if (['grapes', 'foodPairings'].includes(field) && !isStringList(fieldValue)) return false
    if (field === 'storagePotential' && !['LOW', 'MEDIUM', 'HIGH'].includes(String(fieldValue))) return false
    if (['drinkingWindowStart', 'drinkingWindowEnd', 'optimalDrinkingStart', 'optimalDrinkingEnd'].includes(field) && !isYear(fieldValue)) return false
    if (['servingTemperatureMin', 'servingTemperatureMax'].includes(field) && !isTemperature(fieldValue)) return false
    if (field === 'description' && (typeof fieldValue !== 'string' || !fieldValue.trim() || fieldValue.length > 2000)) return false
  }

  const typed = record as WineEnrichment
  if (typed.drinkingWindowStart && typed.drinkingWindowEnd && typed.drinkingWindowStart > typed.drinkingWindowEnd) return false
  if (typed.optimalDrinkingStart && typed.optimalDrinkingEnd && typed.optimalDrinkingStart > typed.optimalDrinkingEnd) return false
  if (typed.servingTemperatureMin != null && typed.servingTemperatureMax != null && typed.servingTemperatureMin > typed.servingTemperatureMax) return false
  return true
}

export function getMissingEnrichmentFields(wine: Wine): WineEnrichmentField[] {
  return enrichmentFields.filter((field) => isMissing(wine[field]))
}

export function mergeWineEnrichment(
  wine: Wine,
  enrichment: WineEnrichment,
  source: string,
  updatedAt = new Date().toISOString(),
): { wine: Wine; report: WineEnrichmentReport } {
  const missingBefore = getMissingEnrichmentFields(wine)
  const next = { ...wine }
  const completedFields: WineEnrichmentField[] = []

  for (const field of missingBefore) {
    const value = enrichment[field]
    if (isMissing(value)) continue
    Object.assign(next, { [field]: value })
    completedFields.push(field)
  }

  if (completedFields.length) {
    next.assessmentSource = wine.assessmentSource ?? source
    next.assessmentUpdatedAt = updatedAt
    next.updatedAt = updatedAt
  }

  return {
    wine: next,
    report: {
      wineId: wine.id,
      wineName: [wine.producer, wine.name, wine.vintage].filter(Boolean).join(' '),
      missingBefore,
      completedFields,
      missingAfter: getMissingEnrichmentFields(next),
    },
  }
}
