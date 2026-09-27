import { supabase } from '@/services/supabase'
import type { ConsumeInput, Inventory, InventoryInput, Tasting } from '@/types/domain'
import { inventoryRowToDomain, inventoryToInsert, tastingRowToDomain, tastingToInsert } from '@/repositories/mappers'
import { selectFifoInventory } from '@/repositories/fifo'
import { RepositoryError, requireUserId } from './shared'
import { logDevelopmentError } from '@/utils/log'

export class SupabaseInventoryRepository {
  async getInventory(): Promise<Inventory[]> {
    const { data, error } = await supabase.from('inventory').select('*').order('purchase_date', { ascending: true, nullsFirst: false })
    if (error) throw new RepositoryError('Kunde inte ladda lagret.', error)
    return data.map(inventoryRowToDomain)
  }

  async getInventoryForWine(wineId: string): Promise<Inventory[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('wine_id', wineId)
      .order('purchase_date', { ascending: true, nullsFirst: false })
    if (error) throw new RepositoryError('Kunde inte ladda vinets lager.', error)
    return data.map(inventoryRowToDomain)
  }

  async addInventory(wineId: string, input: InventoryInput): Promise<Inventory> {
    if (input.quantity < 1) throw new RepositoryError('Antalet måste vara minst 1.')
    const userId = await requireUserId()
    const { data, error } = await supabase.from('inventory').insert(inventoryToInsert(wineId, input, userId)).select('*').single()
    if (error) throw new RepositoryError('Kunde inte lägga till flaskorna.', error)
    return inventoryRowToDomain(data)
  }

  async updateInventory(item: Inventory): Promise<Inventory> {
    if (item.quantity < 0) throw new RepositoryError('Antalet kan inte vara negativt.')
    const { data, error } = await supabase
      .from('inventory')
      .update({
        quantity: item.quantity,
        purchase_price: item.purchasePrice ?? null,
        currency: item.currency,
        purchase_date: item.purchaseDate ?? null,
        purchase_location: item.purchaseLocation ?? null,
        storage_location: item.storageLocation,
        notes: item.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .select('*')
      .single()
    if (error) throw new RepositoryError('Kunde inte uppdatera lagret.', error)
    return inventoryRowToDomain(data)
  }

  async correctInventory(items: Inventory[], totalQuantity: number): Promise<void> {
    if (totalQuantity < 0) throw new RepositoryError('Antalet kan inte vara negativt.')
    await Promise.all(items.map((item, index) => this.updateInventory({ ...item, quantity: index === 0 ? totalQuantity : 0 })))
  }

  async removeBottle(wineId: string, inventoryId?: string): Promise<Inventory> {
    const { data: rows, error: loadError } = await supabase
      .from('inventory')
      .select('*')
      .eq('wine_id', wineId)
      .gt('quantity', 0)
      .order('purchase_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (loadError) throw new RepositoryError('Kunde inte läsa lagersaldot.', loadError)

    const selected = inventoryId
      ? rows.find((row) => row.id === inventoryId)
      : selectFifoInventory(rows)
    if (!selected) throw new RepositoryError('Det finns ingen flaska kvar att ta bort.')

    const { data: updated, error: updateError } = await supabase
      .from('inventory')
      .update({ quantity: selected.quantity - 1, updated_at: new Date().toISOString() })
      .eq('id', selected.id)
      .eq('quantity', selected.quantity)
      .select('*')
      .maybeSingle()
    if (updateError || !updated) throw new RepositoryError('Lagersaldot ändrades av en annan operation. Försök igen.', updateError)
    return inventoryRowToDomain(updated)
  }

  async consumeBottle(wineId: string, input: ConsumeInput): Promise<Tasting> {
    const userId = await requireUserId()
    const { data: rows, error: loadError } = await supabase
      .from('inventory')
      .select('*')
      .eq('wine_id', wineId)
      .gt('quantity', 0)
      .order('purchase_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (loadError) throw new RepositoryError('Kunde inte läsa lagersaldot.', loadError)

    const selected = input.inventoryId
      ? rows.find((row) => row.id === input.inventoryId)
      : selectFifoInventory(rows)
    if (!selected) throw new RepositoryError('Det finns ingen flaska kvar att dricka.')

    const nextQuantity = selected.quantity - 1
    const { data: updated, error: updateError } = await supabase
      .from('inventory')
      .update({ quantity: nextQuantity, updated_at: new Date().toISOString() })
      .eq('id', selected.id)
      .eq('quantity', selected.quantity)
      .select('id')
      .maybeSingle()
    if (updateError || !updated) throw new RepositoryError('Lagersaldot ändrades av en annan operation. Försök igen.', updateError)

    const tasting = tastingToInsert({
      wineId,
      date: input.date,
      rating: input.rating,
      review: input.review?.trim() || undefined,
      maturityAssessment: input.maturityAssessment,
      buyAgain: input.buyAgain,
    }, userId)
    const { data: tastingRow, error: tastingError } = await supabase.from('tastings').insert(tasting).select('*').single()
    if (tastingError) {
      const { error: rollbackError } = await supabase
        .from('inventory')
        .update({ quantity: selected.quantity, updated_at: new Date().toISOString() })
        .eq('id', selected.id)
        .eq('quantity', nextQuantity)
      if (rollbackError) logDevelopmentError('Failed to roll back inventory after tasting error', rollbackError)
      throw new RepositoryError('Kunde inte spara smaknoteringen.', tastingError)
    }
    return tastingRowToDomain(tastingRow)
  }
}
