import type { WineSearchProvider, WineSearchResult } from '@/types/search'

export class CompositeWineSearchProvider implements WineSearchProvider {
  constructor(private readonly providers: WineSearchProvider[]) {}

  async search(query: string): Promise<WineSearchResult[]> {
    const settled = await Promise.allSettled(this.providers.map((provider) => provider.search(query)))
    return settled.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
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
