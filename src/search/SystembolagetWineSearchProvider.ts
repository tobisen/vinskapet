import type { WineSearchProvider, WineSearchResult } from '@/types/search'
import { isValidEan, normalizeEan } from '@/utils/barcode'

interface SearchResponse {
  results: WineSearchResult[]
}

type InvokeFunction = (name: string, options: { body: { query: string } }) => Promise<{ data: SearchResponse | null; error: unknown }>

export const normalizeProductNumber = (value: string): string => value.replace(/\D/g, '')

function isWineSearchResult(value: unknown): value is WineSearchResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<WineSearchResult>
  return result.source === 'SYSTEMBOLAGET' && typeof result.name === 'string'
}

export class SystembolagetWineSearchProvider implements WineSearchProvider {
  constructor(
    private readonly invoke: InvokeFunction,
    private readonly onError?: () => void,
  ) {}

  async search(query: string): Promise<WineSearchResult[]> {
    const normalized = query.trim()
    if (!normalized || (isValidEan(normalized) && normalizeEan(normalized).length !== 7)) return []

    const { data, error } = await this.invoke('systembolaget-search', { body: { query: normalized } })
    if (error) {
      this.onError?.()
      throw new Error('Systembolaget search failed', { cause: error })
    }
    return Array.isArray(data?.results) ? data.results.filter(isWineSearchResult) : []
  }

  async getById(productNumber: string): Promise<WineSearchResult | null> {
    return this.getByProductNumber(productNumber)
  }

  async getByProductNumber(productNumber: string): Promise<WineSearchResult | null> {
    const normalized = normalizeProductNumber(productNumber)
    if (!normalized) return null
    const results = await this.search(normalized)
    return results.find((result) => normalizeProductNumber(result.productNumber ?? '') === normalized)
      ?? results.find((result) => normalizeProductNumber(result.productNumber ?? '').startsWith(normalized))
      ?? null
  }

  async lookupBarcode(_barcode: string): Promise<WineSearchResult[]> {
    // Systembolaget's product pages do not expose a verified EAN relation.
    return []
  }
}
