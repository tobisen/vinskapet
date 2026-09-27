export type WineType =
  | 'RED'
  | 'WHITE'
  | 'ROSE'
  | 'SPARKLING_WHITE'
  | 'SPARKLING_ROSE'
  | 'ORANGE'
  | 'DESSERT'
  | 'FORTIFIED'

export type WineStatus = 'COLLECTION' | 'WISHLIST' | 'WATCHING' | 'HISTORY_ONLY'
export type StorageLocation = 'WINE_FRIDGE' | 'ROOM_STORAGE' | 'OTHER'
export type DrinkingStatus = 'WAIT' | 'CAN_DRINK' | 'OPTIMAL' | 'DRINK_SOON' | 'PAST_WINDOW'
export type MaturityAssessment = 'TOO_YOUNG' | 'GOOD_NOW' | 'PERFECT' | 'DECLINING'
export type BuyAgain = 'YES' | 'MAYBE' | 'NO'
export type Currency = 'SEK' | 'EUR'
export type WineBarcodeSource = 'MANUAL' | 'SYSTEMBOLAGET' | 'OPEN_FOOD_FACTS'

export interface Wine {
  id: string
  producer: string
  name: string
  vintage?: number
  country?: string
  region?: string
  appellation?: string
  wineType: WineType
  grapes: string[]
  alcoholPercentage?: number
  image?: string
  systembolagetProductNumber?: string
  systembolagetUrl?: string
  referencePrice?: number
  currency: Currency
  storagePotential?: 'LOW' | 'MEDIUM' | 'HIGH'
  drinkingWindowStart?: number
  drinkingWindowEnd?: number
  optimalDrinkingStart?: number
  optimalDrinkingEnd?: number
  servingTemperatureMin?: number
  servingTemperatureMax?: number
  foodPairings: string[]
  description?: string
  notes?: string
  assessmentSource?: string
  assessmentUpdatedAt?: string
  status: WineStatus
  createdAt: string
  updatedAt: string
}

export interface Inventory {
  id: string
  wineId: string
  quantity: number
  purchasePrice?: number
  currency: Currency
  purchaseDate?: string
  purchaseLocation?: string
  storageLocation: StorageLocation
  notes?: string
}

export interface Tasting {
  id: string
  wineId: string
  date: string
  rating?: 1 | 2 | 3 | 4 | 5
  review?: string
  occasion?: string
  food?: string
  maturityAssessment?: MaturityAssessment
  buyAgain?: BuyAgain
  notes?: string
}

export interface WineBarcode {
  id: string
  wineId: string
  barcode: string
  source: WineBarcodeSource
  createdAt: string
}

export interface AppData {
  version: number
  wines: Wine[]
  inventory: Inventory[]
  tastings: Tasting[]
}

export interface WineSummary extends Wine {
  quantity: number
  averagePrice?: number
  latestPurchaseDate?: string
  storageLocations: StorageLocation[]
  tastingCount: number
}

export interface WineFilters {
  query: string
  wineType: WineType | 'ALL'
  country: string
  region: string
  vintage: number | 'ALL'
  drinkingStatus: DrinkingStatus | 'ALL'
  storageLocation: StorageLocation | 'ALL'
  availability: 'ALL' | 'IN_STOCK' | 'DRUNK' | 'WISHLIST'
}

export type WineSort =
  | 'DRINK_PRIORITY'
  | 'NAME'
  | 'PRODUCER'
  | 'VINTAGE'
  | 'COUNTRY'
  | 'REGION'
  | 'TYPE'
  | 'PRICE'
  | 'QUANTITY'
  | 'PURCHASE_DATE'
  | 'WINDOW_START'
  | 'WINDOW_END'

export type GroupMode = 'NONE' | 'COUNTRY_REGION' | 'TYPE' | 'DRINKING_PERIOD' | 'STORAGE'

export interface InventoryInput {
  quantity: number
  purchasePrice?: number
  purchaseDate?: string
  purchaseLocation?: string
  storageLocation: StorageLocation
  notes?: string
}

export interface ConsumeInput {
  inventoryId?: string
  date: string
  rating?: Tasting['rating']
  review?: string
  maturityAssessment?: MaturityAssessment
  buyAgain?: BuyAgain
}
