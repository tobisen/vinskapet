import type {
  DrinkingStatus,
  GroupMode,
  Inventory,
  StorageLocation,
  Tasting,
  Wine,
  WineFilters,
  WineSort,
  WineSummary,
  WineType,
} from '@/types/domain'

export const wineTypeLabels: Record<WineType, string> = {
  RED: 'Rött',
  WHITE: 'Vitt',
  ROSE: 'Rosé',
  SPARKLING_WHITE: 'Mousserande',
  SPARKLING_ROSE: 'Mousserande rosé',
  ORANGE: 'Orange',
  DESSERT: 'Dessertvin',
  FORTIFIED: 'Starkvin',
}

export const drinkingStatusLabels: Record<DrinkingStatus, string> = {
  WAIT: 'Vänta',
  CAN_DRINK: 'Kan drickas',
  OPTIMAL: 'Optimal nu',
  DRINK_SOON: 'Drick snart',
  PAST_WINDOW: 'Passerat fönster',
}

export const storageLocationLabels: Record<StorageLocation, string> = {
  WINE_FRIDGE: 'Vinskåp',
  ROOM_STORAGE: 'Rumstemperatur',
  OTHER: 'Övrig förvaring',
}

export function getDrinkingStatus(wine: Wine, currentDate = new Date()): DrinkingStatus {
  const year = currentDate.getFullYear()
  const start = wine.drinkingWindowStart
  const end = wine.drinkingWindowEnd
  const optimalStart = wine.optimalDrinkingStart
  const optimalEnd = wine.optimalDrinkingEnd

  if (start != null && year < start) return 'WAIT'
  if (end != null && year > end) return 'PAST_WINDOW'
  if (optimalStart != null && optimalEnd != null && year >= optimalStart && year <= optimalEnd) {
    return 'OPTIMAL'
  }
  if (end != null && year >= end - 1) return 'DRINK_SOON'
  return 'CAN_DRINK'
}

export function getStorageRecommendation(wine: Wine, currentDate = new Date()): string {
  const status = getDrinkingStatus(wine, currentDate)
  if (status === 'PAST_WINDOW') return 'Ingen längre lagring nödvändig'
  if (status === 'DRINK_SOON') return 'Drick snart'
  if (status === 'OPTIMAL' || status === 'CAN_DRINK') return 'Kan drickas nu'
  if (wine.storagePotential === 'HIGH') return 'Bör lagras i vinskåp'
  return 'Lagring rekommenderas'
}

export const calculateBottleCount = (inventory: Inventory[]): number =>
  inventory.reduce((total, item) => total + Math.max(0, item.quantity), 0)

export const calculateCollectionValue = (inventory: Inventory[]): number =>
  inventory.reduce((total, item) => total + Math.max(0, item.quantity) * (item.purchasePrice ?? 0), 0)

export const calculateAverageRating = (tastings: Tasting[]): number | undefined => {
  const ratings = tastings.flatMap((tasting) => (tasting.rating == null ? [] : [tasting.rating]))
  if (!ratings.length) return undefined
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
}

export function buildWineSummaries(
  wines: Wine[],
  inventory: Inventory[],
  tastings: Tasting[],
): WineSummary[] {
  return wines.map((wine) => {
    const stock = inventory.filter((item) => item.wineId === wine.id)
    const quantity = calculateBottleCount(stock)
    const pricedBottles = stock.filter((item) => item.purchasePrice != null && item.quantity > 0)
    const pricedQuantity = calculateBottleCount(pricedBottles)
    const pricedValue = calculateCollectionValue(pricedBottles)
    const dates = stock.flatMap((item) => (item.purchaseDate ? [item.purchaseDate] : []))
    return {
      ...wine,
      quantity,
      averagePrice: pricedQuantity ? pricedValue / pricedQuantity : wine.referencePrice,
      latestPurchaseDate: dates.sort().at(-1),
      storageLocations: [...new Set(stock.filter((item) => item.quantity > 0).map((item) => item.storageLocation))],
      tastingCount: tastings.filter((item) => item.wineId === wine.id).length,
    }
  })
}

export function filterWines(wines: WineSummary[], filters: WineFilters, now = new Date()): WineSummary[] {
  const query = filters.query.trim().toLocaleLowerCase('sv-SE')
  return wines.filter((wine) => {
    const haystack = [
      wine.producer,
      wine.name,
      wine.country,
      wine.region,
      wine.appellation,
      wine.vintage?.toString(),
      ...wine.grapes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('sv-SE')
    if (query && !haystack.includes(query)) return false
    if (filters.wineType !== 'ALL' && wine.wineType !== filters.wineType) return false
    if (filters.country && wine.country !== filters.country) return false
    if (filters.region && wine.region !== filters.region) return false
    if (filters.vintage !== 'ALL' && wine.vintage !== filters.vintage) return false
    if (filters.drinkingStatus !== 'ALL' && getDrinkingStatus(wine, now) !== filters.drinkingStatus) return false
    if (filters.storageLocation !== 'ALL' && !wine.storageLocations.includes(filters.storageLocation)) return false
    // Text search spans the full wine history even when the collection defaults to in-stock.
    if (filters.availability === 'IN_STOCK' && wine.quantity === 0 && !query) return false
    if (filters.availability === 'DRUNK' && wine.tastingCount === 0) return false
    if (filters.availability === 'WISHLIST' && wine.status !== 'WISHLIST') return false
    return true
  })
}

const priority: Record<DrinkingStatus, number> = {
  PAST_WINDOW: 0,
  DRINK_SOON: 1,
  OPTIMAL: 2,
  CAN_DRINK: 3,
  WAIT: 4,
}

export function sortWines(wines: WineSummary[], sort: WineSort, now = new Date()): WineSummary[] {
  const text = (value?: string) => value ?? ''
  return [...wines].sort((a, b) => {
    switch (sort) {
      case 'NAME': return text(a.name).localeCompare(text(b.name), 'sv')
      case 'PRODUCER': return text(a.producer).localeCompare(text(b.producer), 'sv')
      case 'VINTAGE': return (b.vintage ?? 0) - (a.vintage ?? 0)
      case 'COUNTRY': return text(a.country).localeCompare(text(b.country), 'sv')
      case 'REGION': return text(a.region).localeCompare(text(b.region), 'sv')
      case 'TYPE': return wineTypeLabels[a.wineType].localeCompare(wineTypeLabels[b.wineType], 'sv')
      case 'PRICE': return (b.averagePrice ?? 0) - (a.averagePrice ?? 0)
      case 'QUANTITY': return b.quantity - a.quantity
      case 'PURCHASE_DATE': return text(b.latestPurchaseDate).localeCompare(text(a.latestPurchaseDate))
      case 'WINDOW_START': return (a.drinkingWindowStart ?? 9999) - (b.drinkingWindowStart ?? 9999)
      case 'WINDOW_END': return (a.drinkingWindowEnd ?? 9999) - (b.drinkingWindowEnd ?? 9999)
      default: return priority[getDrinkingStatus(a, now)] - priority[getDrinkingStatus(b, now)]
    }
  })
}

export function getDrinkingPeriod(wine: Wine, now = new Date()): string {
  const status = getDrinkingStatus(wine, now)
  if (status !== 'WAIT') return 'Drick nu'
  const start = wine.drinkingWindowStart ?? now.getFullYear()
  if (start <= 2029) return '2027–2029'
  if (start <= 2034) return '2030–2034'
  return '2035+'
}

export function groupWines(wines: WineSummary[], mode: GroupMode): Map<string, WineSummary[]> {
  const grouped = new Map<string, WineSummary[]>()
  for (const wine of wines) {
    let key = 'Alla viner'
    if (mode === 'COUNTRY_REGION') key = `${wine.country ?? 'Okänt land'} · ${wine.region ?? 'Okänd region'}`
    if (mode === 'TYPE') key = wineTypeLabels[wine.wineType]
    if (mode === 'DRINKING_PERIOD') key = getDrinkingPeriod(wine)
    if (mode === 'STORAGE') key = wine.storageLocations.map((location) => storageLocationLabels[location]).join(', ') || 'Ingen plats'
    grouped.set(key, [...(grouped.get(key) ?? []), wine])
  }
  return grouped
}

export const groupWinesByCountry = (wines: WineSummary[]) => groupWines(wines, 'COUNTRY_REGION')
export const groupWinesByType = (wines: WineSummary[]) => groupWines(wines, 'TYPE')
export const groupWinesByDrinkingPeriod = (wines: WineSummary[]) => groupWines(wines, 'DRINKING_PERIOD')
