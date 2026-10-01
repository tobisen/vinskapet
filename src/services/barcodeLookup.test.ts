import { describe, expect, it, vi } from 'vitest'
import type { WineBarcodeRepository } from '@/repositories/WineBarcodeRepository'
import type { WineBarcode, WineBarcodeSource, WineSummary } from '@/types/domain'
import type { WineSearchProvider, WineSearchResult } from '@/types/search'
import { BarcodeLookupService, evaluateSystembolagetBarcodeCandidate, saveBarcodePurchase, shouldRunBarcodeLookup } from './barcodeLookup'

const EAN = '4006381333931'
const wine: WineSummary = {
  id: 'wine-1', producer: 'Prunotto', name: 'Barbaresco', vintage: 2020, wineType: 'RED',
  grapes: [], foodPairings: [], currency: 'SEK', status: 'COLLECTION', createdAt: '', updatedAt: '',
  quantity: 2, storageLocations: ['WINE_FRIDGE'], tastingCount: 0,
}

class MemoryBarcodeRepository implements WineBarcodeRepository {
  mappings: WineBarcode[] = []
  async findByBarcode(barcode: string) { return this.mappings.find((item) => item.barcode === barcode) }
  async addMapping(barcode: string, wineId: string, source: WineBarcodeSource) {
    const mapping = { id: crypto.randomUUID(), barcode, wineId, source, createdAt: new Date().toISOString() }
    this.mappings = [...this.mappings.filter((item) => item.barcode !== barcode), mapping]
    return mapping
  }
  async removeMapping(barcode: string) { this.mappings = this.mappings.filter((item) => item.barcode !== barcode) }
  async findForWine(wineId: string) { return this.mappings.filter((item) => item.wineId === wineId) }
}

const provider = (matches: WineSearchResult[] = [], reject = false): WineSearchProvider => ({
  search: async () => [], getById: async () => null,
  lookupBarcode: reject ? async () => { throw new Error('offline') } : async () => matches,
})

describe('BarcodeLookupService', () => {
  it('returns a local barcode hit without calling external providers', async () => {
    const mappings = new MemoryBarcodeRepository()
    await mappings.addMapping(EAN, wine.id, 'MANUAL')
    const system = provider()
    const spy = vi.spyOn(system, 'lookupBarcode')
    const result = await new BarcodeLookupService(mappings, () => wine, system).lookup(EAN, false)
    expect(result).toMatchObject({ status: 'MATCH', source: 'LOCAL', result: { existingWine: wine } })
    expect(spy).not.toHaveBeenCalled()
  })

  it('continues after a local miss and returns a Systembolaget barcode hit', async () => {
    const match = { source: 'SYSTEMBOLAGET', name: 'Barolo' }
    const result = await new BarcodeLookupService(new MemoryBarcodeRepository(), () => undefined, provider([match])).lookup(EAN)
    expect(result).toMatchObject({ status: 'MATCH', source: 'SYSTEMBOLAGET', result: match })
  })

  it('uses the free fallback after a Systembolaget miss', async () => {
    const match = { source: 'OPEN_FOOD_FACTS', producer: 'Test', name: 'Wine' }
    const result = await new BarcodeLookupService(new MemoryBarcodeRepository(), () => undefined, provider(), provider([match])).lookup(EAN)
    expect(result).toMatchObject({ status: 'MATCH', source: 'OPEN_FOOD_FACTS' })
  })

  it('matches an Open Food Facts wine to a compatible Systembolaget product', async () => {
    const openFoodFacts = { source: 'OPEN_FOOD_FACTS', producer: 'Prunotto', name: 'Barbaresco', wineType: 'RED' as const }
    const systemMatch = { source: 'SYSTEMBOLAGET', producer: 'Prunotto', name: 'Barbaresco', wineType: 'RED' as const, productNumber: '2201301' }
    const system: WineSearchProvider = {
      search: async () => [], getById: async () => null, lookupBarcode: async () => [], searchWine: async () => [systemMatch],
    }
    const result = await new BarcodeLookupService(new MemoryBarcodeRepository(), () => undefined, system, provider([openFoodFacts])).lookup(EAN)
    expect(result).toMatchObject({ status: 'MATCH', source: 'SYSTEMBOLAGET', result: systemMatch })
  })

  it('matches the GTINHub Chateau Plince result to Systembolaget', async () => {
    const external = { source: 'GTIN_HUB', name: 'Chateau Plince', vintage: 2018, region: 'Pomerol' }
    const systemMatch = { source: 'SYSTEMBOLAGET', producer: 'Ch. Plince', name: 'Château Plince', vintage: 2018, wineType: 'RED' as const, productNumber: '240201' }
    const system: WineSearchProvider = {
      search: async () => [], getById: async () => null, lookupBarcode: async () => [], searchWine: async () => [systemMatch],
    }
    const result = await new BarcodeLookupService(new MemoryBarcodeRepository(), () => undefined, system, provider([external])).lookup('3328155009714')
    expect(result).toMatchObject({ status: 'MATCH', source: 'SYSTEMBOLAGET', result: { productNumber: '240201' } })
  })

  it('does not trust an unverified generic barcode candidate', async () => {
    const external = { source: 'PRODUCT_GURU', name: 'Unrelated product' }
    const result = await new BarcodeLookupService(new MemoryBarcodeRepository(), () => undefined, provider(), provider([external])).lookup(EAN)
    expect(result).toEqual({ status: 'UNKNOWN', barcode: EAN })
  })

  it('explains why a Systembolaget candidate is rejected', () => {
    expect(evaluateSystembolagetBarcodeCandidate(
      { source: 'OPEN_FOOD_FACTS', producer: 'Prunotto', name: 'Barbaresco', wineType: 'RED' },
      { source: 'SYSTEMBOLAGET', producer: 'Other', name: 'Riesling', wineType: 'WHITE' },
    )).toMatchObject({ accepted: false, reason: 'Vintypen skiljer sig.' })
  })

  it('rejects a candidate with a different vintage', () => {
    expect(evaluateSystembolagetBarcodeCandidate(
      { source: 'GTIN_HUB', name: 'Chateau Plince', vintage: 2018 },
      { source: 'SYSTEMBOLAGET', name: 'Château Plince', vintage: 2019 },
    )).toMatchObject({ accepted: false, reason: 'Årgången skiljer sig (2018/2019).' })
  })

  it('switches from automatic EAN lookup to text search when the user types', () => {
    expect(shouldRunBarcodeLookup(EAN, '')).toBe(true)
    expect(shouldRunBarcodeLookup(EAN, 'Barbaresco')).toBe(false)
  })

  it('returns unknown after local, Systembolaget and fallback misses', async () => {
    const result = await new BarcodeLookupService(new MemoryBarcodeRepository(), () => undefined, provider(), provider()).lookup(EAN)
    expect(result.status).toBe('UNKNOWN')
  })

  it('learns a manual mapping and finds it on the next lookup', async () => {
    const mappings = new MemoryBarcodeRepository()
    const service = new BarcodeLookupService(mappings, (id) => id === wine.id ? wine : undefined, provider())
    expect((await service.lookup(EAN)).status).toBe('UNKNOWN')
    await mappings.addMapping(EAN, wine.id, 'MANUAL')
    expect(await service.lookup(EAN)).toMatchObject({ status: 'MATCH', source: 'LOCAL' })
  })

  it('keeps the barcode in offline and provider error states', async () => {
    const service = new BarcodeLookupService(new MemoryBarcodeRepository(), () => undefined, provider([], true))
    expect(await service.lookup(EAN, false)).toEqual({ status: 'OFFLINE', barcode: EAN })
    expect(await service.lookup(EAN, true)).toEqual({ status: 'ERROR', barcode: EAN })
  })

  it('adds inventory to an existing Wine without creating a duplicate and learns the EAN', async () => {
    const mappings = new MemoryBarcodeRepository()
    const createWine = vi.fn(async () => true)
    const addInventory = vi.fn(async () => true)
    const result = await saveBarcodePurchase({
      barcode: EAN, wine, existingWine: wine, inventory: { quantity: 1, storageLocation: 'WINE_FRIDGE' },
      source: 'MANUAL', mappings, createWine, addInventory,
    })
    expect(result).toEqual({ saved: true, wineId: wine.id })
    expect(createWine).not.toHaveBeenCalled()
    expect(addInventory).toHaveBeenCalledWith(wine.id, expect.objectContaining({ quantity: 1 }))
    expect(await mappings.findByBarcode(EAN)).toMatchObject({ wineId: wine.id })
  })

  it('creates a new Wine with Inventory and mapping', async () => {
    const mappings = new MemoryBarcodeRepository()
    const createWine = vi.fn(async () => true)
    const result = await saveBarcodePurchase({
      barcode: EAN, wine, inventory: { quantity: 1, purchasePrice: 199, storageLocation: 'WINE_FRIDGE' },
      source: 'OPEN_FOOD_FACTS', mappings, createWine, addInventory: async () => true,
    })
    expect(result.saved).toBe(true)
    expect(createWine).toHaveBeenCalledWith(wine, expect.objectContaining({ purchasePrice: 199 }))
    expect(await mappings.findByBarcode(EAN)).toMatchObject({ wineId: wine.id, source: 'OPEN_FOOD_FACTS' })
  })
})
