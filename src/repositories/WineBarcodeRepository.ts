import type { WineBarcode, WineBarcodeSource } from '@/types/domain'

export interface WineBarcodeRepository {
  findByBarcode(barcode: string): Promise<WineBarcode | undefined>
  addMapping(barcode: string, wineId: string, source: WineBarcodeSource): Promise<WineBarcode>
  removeMapping(barcode: string): Promise<void>
  findForWine(wineId: string): Promise<WineBarcode[]>
}
