import type { WineSearchProvider, WineSearchResult } from '@/types/search'
import { isValidEan, normalizeEan } from '@/utils/barcode'

type InvokeFunction = (name: string, options: { body: { barcode: string } }) => Promise<{ data: { result?: WineSearchResult | null } | null; error: unknown }>

export class OpenFoodFactsBarcodeSearchProvider implements WineSearchProvider {
  constructor(private readonly invoke: InvokeFunction) {}

  async search(): Promise<WineSearchResult[]> { return [] }
  async getById(): Promise<WineSearchResult | null> { return null }

  async lookupBarcode(value: string): Promise<WineSearchResult[]> {
    const barcode = normalizeEan(value)
    if (!isValidEan(barcode)) return []
    const { data, error } = await this.invoke('barcode-lookup', { body: { barcode } })
    if (error) throw new Error('Open Food Facts barcode lookup failed', { cause: error })
    return data?.result ? [data.result] : []
  }
}
