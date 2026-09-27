import { describe, expect, it } from 'vitest'
import type { Wine, WineSummary } from '@/types/domain'
import type { WineSearchProvider } from '@/types/search'
import { LatestWineSearch } from './LatestWineSearch'
import { mergeSearchResults } from './CompositeWineSearchProvider'
import { LocalCollectionWineSearchProvider } from './LocalCollectionWineSearchProvider'
import { findDuplicateWine, saveWinePurchase } from './duplicates'

const wine: WineSummary = {
  id: 'deaetna', producer: 'Terra Costantino', name: 'DeAetna Rosso', vintage: 2023,
  country: 'Italien', region: 'Sicilien, Etna', appellation: 'Etna Rosso DOC', wineType: 'RED',
  grapes: ['Nerello Mascalese'], systembolagetProductNumber: '12345', currency: 'SEK',
  foodPairings: [], status: 'COLLECTION', createdAt: '', updatedAt: '', quantity: 2,
  storageLocations: ['WINE_FRIDGE'], tastingCount: 0,
}

describe('local wine search', () => {
  const provider = new LocalCollectionWineSearchProvider(() => [wine])

  for (const query of ['Terra', 'DeAetna', '2023', 'Nerello', '12345']) {
    it(`finds by ${query}`, async () => {
      expect((await provider.search(query)).map((result) => result.externalId)).toEqual(['deaetna'])
    })
  }
})

describe('duplicate matching', () => {
  it('prefers an internal id and matches product number or identity', () => {
    const wines: Wine[] = [wine]
    expect(findDuplicateWine({ source: 'LOCAL_COLLECTION', externalId: 'deaetna', name: 'Annat' }, wines)?.id).toBe('deaetna')
    expect(findDuplicateWine({ source: 'SYSTEMBOLAGET', productNumber: '12 345', name: 'Annat' }, wines)?.id).toBe('deaetna')
    expect(findDuplicateWine({ source: 'MANUAL', producer: 'terra costantino', name: 'deaetna rosso', vintage: 2023 }, wines)?.id).toBe('deaetna')
  })

  it('adds inventory without creating a new wine when a match exists', async () => {
    let created = 0
    let inventoryAdded = 0
    const result = await saveWinePurchase(wine, {
      quantity: 1, storageLocation: 'WINE_FRIDGE',
    }, wine, {
      createWine: async () => { created += 1; return true },
      addInventory: async () => { inventoryAdded += 1; return true },
    })

    expect(result).toEqual({ saved: true, wineId: 'deaetna' })
    expect(created).toBe(0)
    expect(inventoryAdded).toBe(1)
  })
})

describe('combined search', () => {
  it('keeps the local result when the same product is returned externally', () => {
    const results = mergeSearchResults([
      { source: 'SYSTEMBOLAGET', externalId: 'external', name: 'DeAetna Rosso', productNumber: '12345' },
      { source: 'LOCAL_COLLECTION', externalId: wine.id, name: wine.name, productNumber: '12 345', existingWine: wine },
    ])
    expect(results).toHaveLength(1)
    expect(results[0]?.source).toBe('LOCAL_COLLECTION')
  })
})

describe('async search race protection', () => {
  it('marks a late response stale', async () => {
    const provider: WineSearchProvider = {
      search: (query) => new Promise((resolve) => setTimeout(() => resolve([{ source: 'TEST', name: query }]), query === 'first' ? 20 : 1)),
      getById: async () => null,
    }
    const search = new LatestWineSearch(provider)
    const first = search.search('first')
    const second = search.search('second')
    expect((await second).results[0]?.name).toBe('second')
    expect(await first).toEqual({ results: [], stale: true })
  })
})
