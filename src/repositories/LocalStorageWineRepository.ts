import { seedData } from '@/data/seed'
import type { WineRepository } from '@/repositories/WineRepository'
import type { AppData, ConsumeInput, Inventory, InventoryInput, Tasting, Wine } from '@/types/domain'
import { createId } from '@/utils/id'

const STORAGE_KEY = 'vinskapet:data:v1'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export class LocalStorageWineRepository implements WineRepository {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'>) {}

  private read(): AppData {
    const saved = this.storage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as AppData
    const initial = clone(seedData)
    this.write(initial)
    return initial
  }

  private write(data: AppData): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  getData(): AppData { return this.read() }
  getWines(): Wine[] { return this.read().wines }
  getWine(id: string): Wine | undefined { return this.read().wines.find((wine) => wine.id === id) }

  createWine(wine: Wine): Wine {
    const data = this.read()
    data.wines.push(clone(wine))
    this.write(data)
    return wine
  }

  updateWine(wine: Wine): Wine {
    const data = this.read()
    const index = data.wines.findIndex((item) => item.id === wine.id)
    if (index < 0) throw new Error('Vinet kunde inte hittas.')
    data.wines[index] = clone(wine)
    this.write(data)
    return wine
  }

  deleteWine(wineId: string): void {
    const data = this.read()
    if (!data.wines.some((wine) => wine.id === wineId)) throw new Error('Vinet kunde inte hittas.')
    data.wines = data.wines.filter((wine) => wine.id !== wineId)
    data.inventory = data.inventory.filter((item) => item.wineId !== wineId)
    data.tastings = data.tastings.filter((tasting) => tasting.wineId !== wineId)
    this.write(data)
  }

  getInventory(wineId?: string): Inventory[] {
    const items = this.read().inventory
    return wineId ? items.filter((item) => item.wineId === wineId) : items
  }

  addInventory(wineId: string, input: InventoryInput): Inventory {
    if (input.quantity < 1) throw new Error('Antalet måste vara minst 1.')
    const data = this.read()
    if (!data.wines.some((wine) => wine.id === wineId)) throw new Error('Vinet kunde inte hittas.')
    const item: Inventory = {
      id: createId('inventory'), wineId, currency: 'SEK', ...clone(input),
    }
    data.inventory.push(item)
    const wine = data.wines.find((entry) => entry.id === wineId)!
    wine.status = 'COLLECTION'
    wine.updatedAt = new Date().toISOString()
    this.write(data)
    return item
  }

  updateInventory(item: Inventory): Inventory {
    if (item.quantity < 0) throw new Error('Antalet kan inte vara negativt.')
    const data = this.read()
    const index = data.inventory.findIndex((entry) => entry.id === item.id)
    if (index < 0) throw new Error('Inköpet kunde inte hittas.')
    data.inventory[index] = clone(item)
    const totalLeft = data.inventory
      .filter((entry) => entry.wineId === item.wineId)
      .reduce((sum, entry) => sum + entry.quantity, 0)
    const wine = data.wines.find((entry) => entry.id === item.wineId)
    if (wine) wine.status = totalLeft > 0 ? 'COLLECTION' : 'HISTORY_ONLY'
    this.write(data)
    return item
  }

  removeBottle(wineId: string, inventoryId?: string): Inventory {
    const candidates = this.getInventory(wineId).filter((item) => item.quantity > 0)
    const inventory = inventoryId
      ? candidates.find((item) => item.id === inventoryId)
      : candidates.sort((a, b) => (a.purchaseDate ?? '').localeCompare(b.purchaseDate ?? ''))[0]
    if (!inventory) throw new Error('Det finns ingen flaska kvar att ta bort.')
    return this.updateInventory({ ...inventory, quantity: inventory.quantity - 1 })
  }

  consumeBottle(wineId: string, input: ConsumeInput): Tasting {
    const data = this.read()
    const candidates = data.inventory.filter((item) => item.wineId === wineId && item.quantity > 0)
    const inventory = input.inventoryId
      ? candidates.find((item) => item.id === input.inventoryId)
      : candidates.sort((a, b) => (a.purchaseDate ?? '').localeCompare(b.purchaseDate ?? ''))[0]
    if (!inventory) throw new Error('Det finns ingen flaska kvar att dricka.')

    inventory.quantity -= 1
    const tasting: Tasting = {
      id: createId('tasting'), wineId, date: input.date, rating: input.rating,
      review: input.review?.trim() || undefined, maturityAssessment: input.maturityAssessment,
      buyAgain: input.buyAgain,
    }
    data.tastings.push(tasting)
    const totalLeft = data.inventory
      .filter((item) => item.wineId === wineId)
      .reduce((sum, item) => sum + item.quantity, 0)
    if (totalLeft === 0) {
      const wine = data.wines.find((item) => item.id === wineId)
      if (wine) wine.status = 'HISTORY_ONLY'
    }
    this.write(data)
    return tasting
  }

  getTastings(wineId?: string): Tasting[] {
    const items = this.read().tastings
    return wineId ? items.filter((item) => item.wineId === wineId) : items
  }

  createTasting(tasting: Tasting): Tasting {
    const data = this.read()
    data.tastings.push(clone(tasting))
    this.write(data)
    return tasting
  }

  deleteTasting(tastingId: string): void {
    const data = this.read()
    if (!data.tastings.some((tasting) => tasting.id === tastingId)) throw new Error('Smaknoteringen kunde inte hittas.')
    data.tastings = data.tastings.filter((tasting) => tasting.id !== tastingId)
    this.write(data)
  }

  getWishlist(): Wine[] { return this.read().wines.filter((wine) => wine.status === 'WISHLIST') }

  addToWishlist(wineId: string): Wine {
    const wine = this.requireWine(wineId)
    return this.updateWine({ ...wine, status: 'WISHLIST', updatedAt: new Date().toISOString() })
  }

  removeFromWishlist(wineId: string): Wine {
    const wine = this.requireWine(wineId)
    return this.updateWine({ ...wine, status: 'HISTORY_ONLY', updatedAt: new Date().toISOString() })
  }

  private requireWine(id: string): Wine {
    const wine = this.getWine(id)
    if (!wine) throw new Error('Vinet kunde inte hittas.')
    return wine
  }
}
