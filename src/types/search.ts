import type { Currency, Wine, WineType } from './domain'

export interface WineSearchResult {
  externalId?: string
  source: string
  barcode?: string
  producer?: string
  name: string
  vintage?: number
  country?: string
  region?: string
  appellation?: string
  wineType?: WineType
  grapes?: string[]
  alcoholPercentage?: number
  imageUrl?: string
  productNumber?: string
  productUrl?: string
  referencePrice?: number
  currency?: Currency
  servingTemperatureMin?: number
  servingTemperatureMax?: number
  foodPairings?: string[]
  description?: string
  existingWine?: Wine
  quantity?: number
}

export interface WineSearchProvider {
  search(query: string): Promise<WineSearchResult[]>
  getById(id: string): Promise<WineSearchResult | null>
  lookupBarcode?(barcode: string): Promise<WineSearchResult[]>
}

export type WineCandidate = Omit<WineSearchResult, 'existingWine' | 'quantity'>

export interface WineEnrichment {
  grapes?: string[]
  storagePotential?: Wine['storagePotential']
  drinkingWindowStart?: number
  drinkingWindowEnd?: number
  optimalDrinkingStart?: number
  optimalDrinkingEnd?: number
  servingTemperatureMin?: number
  servingTemperatureMax?: number
  foodPairings?: string[]
  description?: string
}

export interface WineEnrichmentService {
  enrich(wine: WineCandidate): Promise<WineEnrichment>
}

export type WineEnrichmentField = keyof WineEnrichment

export interface WineEnrichmentReport {
  wineId: string
  wineName: string
  missingBefore: WineEnrichmentField[]
  completedFields: WineEnrichmentField[]
  missingAfter: WineEnrichmentField[]
}

export interface WineLabelRecognitionService {
  recognize(image: File): Promise<WineSearchResult[]>
}
