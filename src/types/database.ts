import type { BuyAgain, Currency, MaturityAssessment, StorageLocation, WineBarcodeSource, WineStatus, WineType } from './domain'

export interface WineRow {
  [key: string]: unknown
  id: string
  user_id: string
  producer: string
  name: string
  vintage: number | null
  country: string | null
  region: string | null
  appellation: string | null
  wine_type: WineType
  grapes: string[] | null
  alcohol_percentage: number | null
  image_url: string | null
  systembolaget_product_number: string | null
  systembolaget_url: string | null
  reference_price: number | null
  currency: Currency
  storage_potential: 'LOW' | 'MEDIUM' | 'HIGH' | null
  drinking_window_start: number | null
  drinking_window_end: number | null
  optimal_drinking_start: number | null
  optimal_drinking_end: number | null
  serving_temperature_min: number | null
  serving_temperature_max: number | null
  food_pairings: string[] | null
  description: string | null
  notes: string | null
  assessment_source: string | null
  assessment_updated_at: string | null
  status: WineStatus
  created_at: string
  updated_at: string
}

export interface InventoryRow {
  [key: string]: unknown
  id: string
  user_id: string
  wine_id: string
  quantity: number
  purchase_price: number | null
  currency: Currency
  purchase_date: string | null
  purchase_location: string | null
  storage_location: StorageLocation
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TastingRow {
  [key: string]: unknown
  id: string
  user_id: string
  wine_id: string
  tasted_at: string
  rating: number | null
  review: string | null
  occasion: string | null
  food: string | null
  maturity_assessment: MaturityAssessment | null
  buy_again: BuyAgain | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WineBarcodeRow {
  [key: string]: unknown
  id: string
  user_id: string
  wine_id: string
  barcode: string
  source: WineBarcodeSource
  created_at: string
}

type WineInsert = Omit<WineRow, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<WineRow, 'id' | 'created_at' | 'updated_at'>>
type InventoryInsert = Omit<InventoryRow, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<InventoryRow, 'id' | 'created_at' | 'updated_at'>>
type TastingInsert = Omit<TastingRow, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<TastingRow, 'id' | 'created_at' | 'updated_at'>>
type WineBarcodeInsert = Omit<WineBarcodeRow, 'id' | 'created_at'> & Partial<Pick<WineBarcodeRow, 'id' | 'created_at'>>

export interface Database {
  public: {
    Tables: {
      wines: { Row: WineRow; Insert: WineInsert; Update: Partial<WineInsert>; Relationships: [] }
      inventory: { Row: InventoryRow; Insert: InventoryInsert; Update: Partial<InventoryInsert>; Relationships: [] }
      tastings: { Row: TastingRow; Insert: TastingInsert; Update: Partial<TastingInsert>; Relationships: [] }
      wine_barcodes: { Row: WineBarcodeRow; Insert: WineBarcodeInsert; Update: Partial<WineBarcodeInsert>; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: {
      delete_own_wine: { Args: { target_wine_id: string }; Returns: undefined }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type { InventoryInsert, TastingInsert, WineBarcodeInsert, WineInsert }
