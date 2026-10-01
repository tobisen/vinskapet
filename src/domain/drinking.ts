import type {
  DrinkClassification,
  DrinkingRecommendation,
  Wine,
  WineSummary,
} from '@/types/domain'

const classificationPriority: Record<DrinkClassification, number> = {
  DRINK_SOON: 0,
  DRINK_NOW: 1,
  CAN_DRINK: 2,
  WAIT: 3,
  UNKNOWN: 4,
}

const within = (year: number, start?: number, end?: number): boolean =>
  (start != null || end != null)
  && (start == null || year >= start)
  && (end == null || year <= end)

function period(prefix: string, start?: number, end?: number): string {
  if (start != null && end != null) return `${prefix} ${start}–${end}`
  if (start != null) return `${prefix} från ${start}`
  return `${prefix} till ${end}`
}

export function classifyWineForDrinking(
  wine: Wine,
  currentDate = new Date(),
): { classification: DrinkClassification; explanation: string } {
  const year = currentDate.getFullYear()
  const drinkingStart = wine.drinkingWindowStart
  const drinkingEnd = wine.drinkingWindowEnd
  const optimalStart = wine.optimalDrinkingStart
  const optimalEnd = wine.optimalDrinkingEnd
  const hasDrinkingWindow = drinkingStart != null || drinkingEnd != null
  const hasOptimalWindow = optimalStart != null || optimalEnd != null

  if (drinkingEnd != null && year > drinkingEnd) {
    return { classification: 'DRINK_SOON', explanation: `Drickfönstret slutade ${drinkingEnd}` }
  }
  if (drinkingEnd != null && year >= drinkingEnd - 1) {
    return { classification: 'DRINK_SOON', explanation: 'Drickfönstret närmar sig slutet' }
  }
  if (optimalEnd != null && year > optimalEnd) {
    return { classification: 'DRINK_SOON', explanation: `Optimal period slutade ${optimalEnd}` }
  }
  if (within(year, optimalStart, optimalEnd)) {
    return { classification: 'DRINK_NOW', explanation: period('Optimal period', optimalStart, optimalEnd) }
  }
  if (within(year, drinkingStart, drinkingEnd)) {
    const explanation = optimalStart != null && year < optimalStart
      ? `Kan drickas nu. Optimal från ${optimalStart}`
      : period('Drickfönster', drinkingStart, drinkingEnd)
    return { classification: 'CAN_DRINK', explanation }
  }
  if ((drinkingStart != null && year < drinkingStart) || (optimalStart != null && year < optimalStart)) {
    const nextStart = drinkingStart != null && year < drinkingStart ? drinkingStart : optimalStart
    const explanation = optimalStart != null && year < optimalStart
      ? `Optimal från ${optimalStart}`
      : `Drickfönstret börjar ${nextStart}`
    return { classification: 'WAIT', explanation }
  }

  if (!hasDrinkingWindow && !hasOptimalWindow) {
    const context = [wine.vintage ? `årgång ${wine.vintage}` : '', wine.storagePotential === 'HIGH' ? 'lång lagringspotential' : '']
      .filter(Boolean)
      .join(', ')
    return {
      classification: 'UNKNOWN',
      explanation: context ? `Drickfönster saknas (${context})` : 'Drickfönster saknas',
    }
  }

  return { classification: 'UNKNOWN', explanation: 'Drickläget kan inte bedömas säkert' }
}

function urgencyYear(wine: Wine, classification: DrinkClassification): number {
  if (classification === 'DRINK_SOON') return wine.drinkingWindowEnd ?? wine.optimalDrinkingEnd ?? 9999
  if (classification === 'DRINK_NOW') return wine.optimalDrinkingEnd ?? wine.drinkingWindowEnd ?? 9999
  if (classification === 'CAN_DRINK') return wine.drinkingWindowEnd ?? wine.optimalDrinkingStart ?? 9999
  if (classification === 'WAIT') return wine.drinkingWindowStart ?? wine.optimalDrinkingStart ?? 9999
  return wine.vintage ?? 9999
}

export function buildDrinkingRecommendations(
  wines: readonly WineSummary[],
  currentDate = new Date(),
): DrinkingRecommendation[] {
  return wines
    .filter((wine) => wine.quantity > 0)
    .map((wine) => ({ wine, ...classifyWineForDrinking(wine, currentDate) }))
    .sort((a, b) =>
      classificationPriority[a.classification] - classificationPriority[b.classification]
      || urgencyYear(a.wine, a.classification) - urgencyYear(b.wine, b.classification)
      || (a.wine.vintage ?? 9999) - (b.wine.vintage ?? 9999)
      || a.wine.name.localeCompare(b.wine.name, 'sv'),
    )
}

export function countDrinkingBottles(
  recommendations: readonly DrinkingRecommendation[],
): Record<DrinkClassification, number> {
  const counts: Record<DrinkClassification, number> = {
    DRINK_SOON: 0,
    DRINK_NOW: 0,
    CAN_DRINK: 0,
    WAIT: 0,
    UNKNOWN: 0,
  }
  for (const recommendation of recommendations) {
    counts[recommendation.classification] += recommendation.wine.quantity
  }
  return counts
}
