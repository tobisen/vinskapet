import type { AppData, ConsumeInput, Inventory, InventoryInput, Tasting, Wine } from '@/types/domain'

export interface WineRepository {
  getData(): AppData
  getWines(): Wine[]
  getWine(id: string): Wine | undefined
  createWine(wine: Wine): Wine
  updateWine(wine: Wine): Wine
  getInventory(wineId?: string): Inventory[]
  addInventory(wineId: string, input: InventoryInput): Inventory
  updateInventory(item: Inventory): Inventory
  removeBottle(wineId: string, inventoryId?: string): Inventory
  consumeBottle(wineId: string, input: ConsumeInput): Tasting
  getTastings(wineId?: string): Tasting[]
  createTasting(tasting: Tasting): Tasting
  getWishlist(): Wine[]
  addToWishlist(wineId: string): Wine
  removeFromWishlist(wineId: string): Wine
}
