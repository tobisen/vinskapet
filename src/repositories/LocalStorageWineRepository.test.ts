import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageWineRepository } from './LocalStorageWineRepository'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

describe('LocalStorageWineRepository', () => {
  let repository: LocalStorageWineRepository

  beforeEach(() => { repository = new LocalStorageWineRepository(new MemoryStorage()) })

  it('seeds once and preserves mutations across reads', () => {
    const initial = repository.getData()
    repository.addInventory(initial.wines[0]!.id, { quantity: 2, purchasePrice: 300, storageLocation: 'WINE_FRIDGE' })
    expect(repository.getInventory(initial.wines[0]!.id).at(-1)?.quantity).toBe(2)
    expect(repository.getData().wines).toHaveLength(initial.wines.length)
  })

  it('consumes one bottle and creates a tasting', () => {
    const wineId = 'umani-ronchi-2022'
    const before = repository.getInventory(wineId).reduce((sum, item) => sum + item.quantity, 0)
    repository.consumeBottle(wineId, { date: '2026-09-26', rating: 4, review: 'Fin.' })
    const after = repository.getInventory(wineId).reduce((sum, item) => sum + item.quantity, 0)
    expect(after).toBe(before - 1)
    expect(repository.getTastings(wineId).at(-1)).toMatchObject({ rating: 4, review: 'Fin.' })
    expect(repository.getWine(wineId)?.status).toBe('HISTORY_ONLY')
  })

  it('rejects consumption at zero inventory', () => {
    expect(() => repository.consumeBottle('history-riesling-2019', { date: '2026-09-26' })).toThrow('ingen flaska')
  })

  it('corrects inventory without creating a tasting', () => {
    const item = repository.getInventory('prunotto-barbaresco-2020')[0]!
    const tastingCount = repository.getTastings().length
    repository.updateInventory({ ...item, quantity: 7 })
    expect(repository.getInventory(item.wineId)[0]!.quantity).toBe(7)
    expect(repository.getTastings()).toHaveLength(tastingCount)
  })

  it('removes one bottle without creating a tasting', () => {
    const wineId = 'prunotto-barbaresco-2020'
    const before = repository.getInventory(wineId).reduce((sum, item) => sum + item.quantity, 0)
    const tastingCount = repository.getTastings(wineId).length
    repository.removeBottle(wineId)
    const after = repository.getInventory(wineId).reduce((sum, item) => sum + item.quantity, 0)
    expect(after).toBe(before - 1)
    expect(repository.getTastings(wineId)).toHaveLength(tastingCount)
  })

  it('turns a manually emptied inventory into retained history', () => {
    const item = repository.getInventory('prunotto-barbaresco-2020')[0]!
    repository.updateInventory({ ...item, quantity: 0 })
    expect(repository.getWine(item.wineId)?.status).toBe('HISTORY_ONLY')
  })

  it('keeps a wine after its final bottle is consumed', () => {
    const wineId = 'umani-ronchi-2022'
    repository.consumeBottle(wineId, { date: '2026-09-26' })
    expect(repository.getWine(wineId)).toBeDefined()
    expect(repository.getWine(wineId)?.status).toBe('HISTORY_ONLY')
  })
})
