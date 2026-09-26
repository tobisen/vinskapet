import { supabase } from '@/services/supabase'
import type { Wine } from '@/types/domain'
import { wineRowToDomain, wineToInsert, wineToUpdate } from '@/repositories/mappers'
import { RepositoryError, requireUserId } from './shared'

export class SupabaseWineRepository {
  async getWines(): Promise<Wine[]> {
    const { data, error } = await supabase.from('wines').select('*').order('created_at', { ascending: true })
    if (error) throw new RepositoryError('Kunde inte ladda viner.', error)
    return data.map(wineRowToDomain)
  }

  async getWine(id: string): Promise<Wine | undefined> {
    const { data, error } = await supabase.from('wines').select('*').eq('id', id).maybeSingle()
    if (error) throw new RepositoryError('Kunde inte ladda vinet.', error)
    return data ? wineRowToDomain(data) : undefined
  }

  async createWine(wine: Wine): Promise<Wine> {
    const userId = await requireUserId()
    const { data, error } = await supabase.from('wines').insert(wineToInsert(wine, userId)).select('*').single()
    if (error) throw new RepositoryError('Kunde inte skapa vinet.', error)
    return wineRowToDomain(data)
  }

  async updateWine(wine: Wine): Promise<Wine> {
    const { data, error } = await supabase
      .from('wines')
      .update({ ...wineToUpdate(wine), updated_at: new Date().toISOString() })
      .eq('id', wine.id)
      .select('*')
      .single()
    if (error) throw new RepositoryError('Kunde inte uppdatera vinet.', error)
    return wineRowToDomain(data)
  }

  async getWishlist(): Promise<Wine[]> {
    const { data, error } = await supabase.from('wines').select('*').eq('status', 'WISHLIST').order('created_at')
    if (error) throw new RepositoryError('Kunde inte ladda önskelistan.', error)
    return data.map(wineRowToDomain)
  }

  async addToWishlist(wineId: string): Promise<Wine> {
    return this.updateStatus(wineId, 'WISHLIST')
  }

  async removeFromWishlist(wineId: string): Promise<Wine> {
    return this.updateStatus(wineId, 'HISTORY_ONLY')
  }

  private async updateStatus(wineId: string, status: Wine['status']): Promise<Wine> {
    const { data, error } = await supabase
      .from('wines')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', wineId)
      .select('*')
      .single()
    if (error) throw new RepositoryError('Kunde inte uppdatera vinets status.', error)
    return wineRowToDomain(data)
  }
}
