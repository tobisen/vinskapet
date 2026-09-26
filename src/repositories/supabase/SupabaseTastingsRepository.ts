import { supabase } from '@/services/supabase'
import type { Tasting } from '@/types/domain'
import { tastingRowToDomain, tastingToInsert } from '@/repositories/mappers'
import { RepositoryError, requireUserId } from './shared'

export class SupabaseTastingsRepository {
  async getTastings(): Promise<Tasting[]> {
    const { data, error } = await supabase.from('tastings').select('*').order('tasted_at', { ascending: false })
    if (error) throw new RepositoryError('Kunde inte ladda historiken.', error)
    return data.map(tastingRowToDomain)
  }

  async getTastingsForWine(wineId: string): Promise<Tasting[]> {
    const { data, error } = await supabase.from('tastings').select('*').eq('wine_id', wineId).order('tasted_at', { ascending: false })
    if (error) throw new RepositoryError('Kunde inte ladda vinets historik.', error)
    return data.map(tastingRowToDomain)
  }

  async createTasting(tasting: Omit<Tasting, 'id'>): Promise<Tasting> {
    const userId = await requireUserId()
    const { data, error } = await supabase.from('tastings').insert(tastingToInsert(tasting, userId)).select('*').single()
    if (error) throw new RepositoryError('Kunde inte spara smaknoteringen.', error)
    return tastingRowToDomain(data)
  }
}
