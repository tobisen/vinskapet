import type { WineSearchProvider, WineSearchResult } from '@/types/search'

export class LatestWineSearch {
  private requestId = 0

  constructor(private readonly provider: WineSearchProvider) {}

  async search(query: string): Promise<{ results: WineSearchResult[]; stale: boolean }> {
    const requestId = ++this.requestId
    const results = await this.provider.search(query)
    return { results: requestId === this.requestId ? results : [], stale: requestId !== this.requestId }
  }

  cancel(): void {
    this.requestId += 1
  }
}
