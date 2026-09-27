import type { WineSearchProvider, WineSearchResult } from '@/types/search'

const normalized = (value?: string): string => value?.trim().toLocaleLowerCase('sv-SE') ?? ''

function resultKey(result: WineSearchResult): string {
  const productNumber = result.productNumber?.replace(/\D/g, '')
  if (productNumber) return `product:${productNumber}`
  return `wine:${normalized(result.producer)}:${normalized(result.name)}:${result.vintage ?? ''}`
}

export function mergeSearchResults(results: WineSearchResult[]): WineSearchResult[] {
  const unique = new Map<string, WineSearchResult>()
  for (const result of results) {
    const key = resultKey(result)
    const current = unique.get(key)
    if (!current || (result.source === 'LOCAL_COLLECTION' && current.source !== 'LOCAL_COLLECTION')) unique.set(key, result)
  }
  return [...unique.values()]
}

export class CompositeWineSearchProvider implements WineSearchProvider {
  constructor(private readonly providers: WineSearchProvider[]) {}

  async search(query: string): Promise<WineSearchResult[]> {
    const settled = await Promise.allSettled(this.providers.map((provider) => provider.search(query)))
    return mergeSearchResults(settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []))
  }

  async getById(id: string): Promise<WineSearchResult | null> {
    for (const provider of this.providers) {
      const result = await provider.getById(id)
      if (result) return result
    }
    return null
  }

  async lookupBarcode(barcode: string): Promise<WineSearchResult[]> {
    const capable = this.providers.filter((provider) => provider.lookupBarcode)
    const settled = await Promise.allSettled(capable.map((provider) => provider.lookupBarcode!(barcode)))
    return settled.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
  }
}
