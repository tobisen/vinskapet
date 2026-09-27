export interface WineCandidate {
  source: string
  producer?: string
  name: string
  vintage?: number
  country?: string
  region?: string
  appellation?: string
  wineType?: string
  grapes?: string[]
  alcoholPercentage?: number
  imageUrl?: string
  productNumber?: string
  productUrl?: string
  referencePrice?: number
  currency?: string
  storagePotential?: 'LOW' | 'MEDIUM' | 'HIGH'
  drinkingWindowStart?: number
  drinkingWindowEnd?: number
  optimalDrinkingStart?: number
  optimalDrinkingEnd?: number
  servingTemperatureMin?: number
  servingTemperatureMax?: number
  foodPairings?: string[]
  description?: string
}

export interface WineEnrichment {
  grapes?: string[]
  storagePotential?: 'LOW' | 'MEDIUM' | 'HIGH'
  drinkingWindowStart?: number
  drinkingWindowEnd?: number
  optimalDrinkingStart?: number
  optimalDrinkingEnd?: number
  servingTemperatureMin?: number
  servingTemperatureMax?: number
  foodPairings?: string[]
  description?: string
  confidence?: number
  reasoningSummary?: string
  ruleIds?: string[]
}

const fields = new Set([
  'grapes', 'storagePotential', 'drinkingWindowStart', 'drinkingWindowEnd',
  'optimalDrinkingStart', 'optimalDrinkingEnd', 'servingTemperatureMin',
  'servingTemperatureMax', 'foodPairings', 'description', 'confidence', 'reasoningSummary', 'ruleIds',
])

const isYear = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 1900 && Number(value) <= 2200
const isTemperature = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 30
const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.length <= 12 && value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 80)

export function isWineCandidate(value: unknown): value is WineCandidate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.name === 'string' && candidate.name.trim().length > 0 && candidate.name.length <= 200
    && typeof candidate.source === 'string' && candidate.source.length <= 40
}

export function isWineEnrichment(value: unknown): value is WineEnrichment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  if (!Object.keys(record).every((key) => fields.has(key))) return false

  for (const [field, item] of Object.entries(record)) {
    if (item == null) continue
    if (['grapes', 'foodPairings'].includes(field) && !isStringList(item)) return false
    if (field === 'storagePotential' && !['LOW', 'MEDIUM', 'HIGH'].includes(String(item))) return false
    if (['drinkingWindowStart', 'drinkingWindowEnd', 'optimalDrinkingStart', 'optimalDrinkingEnd'].includes(field) && !isYear(item)) return false
    if (['servingTemperatureMin', 'servingTemperatureMax'].includes(field) && !isTemperature(item)) return false
    if (field === 'description' && (typeof item !== 'string' || !item.trim() || item.length > 600)) return false
    if (field === 'confidence' && (typeof item !== 'number' || item < 0 || item > 1)) return false
    if (field === 'reasoningSummary' && (typeof item !== 'string' || !item.trim() || item.length > 500)) return false
    if (field === 'ruleIds' && (!isStringList(item) || item.some((ruleId) => !/^[A-Z0-9_]+$/.test(ruleId)))) return false
  }

  const result = record as WineEnrichment
  if (result.drinkingWindowStart && result.drinkingWindowEnd && result.drinkingWindowStart > result.drinkingWindowEnd) return false
  if (result.optimalDrinkingStart && result.optimalDrinkingEnd && result.optimalDrinkingStart > result.optimalDrinkingEnd) return false
  if (result.drinkingWindowStart && result.optimalDrinkingStart && result.drinkingWindowStart > result.optimalDrinkingStart) return false
  if (result.optimalDrinkingEnd && result.drinkingWindowEnd && result.optimalDrinkingEnd > result.drinkingWindowEnd) return false
  if (result.servingTemperatureMin != null && result.servingTemperatureMax != null && result.servingTemperatureMin > result.servingTemperatureMax) return false
  return true
}
