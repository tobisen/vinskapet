import { supabase } from '@/services/supabase'
import type { WineBarcode, WineBarcodeSource } from '@/types/domain'
import type { WineBarcodeRow } from '@/types/database'
import type { WineBarcodeRepository } from '@/repositories/WineBarcodeRepository'
import { isValidEan, normalizeEan } from '@/utils/barcode'
import { RepositoryError, requireUserId } from './shared'

const cacheKey = (userId: string): string => `vinskapet:barcodes:${userId}`
const toDomain = (row: WineBarcodeRow): WineBarcode => ({
  id: row.id, wineId: row.wine_id, barcode: row.barcode, source: row.source, createdAt: row.created_at,
})

function readCache(userId: string): WineBarcode[] {
  try { return JSON.parse(localStorage.getItem(cacheKey(userId)) ?? '[]') as WineBarcode[] } catch { return [] }
}

function writeCache(userId: string, mappings: WineBarcode[]): void {
  localStorage.setItem(cacheKey(userId), JSON.stringify(mappings))
}

export class SupabaseWineBarcodeRepository implements WineBarcodeRepository {
  async findByBarcode(value: string): Promise<WineBarcode | undefined> {
    const barcode = normalizeEan(value)
    if (!isValidEan(barcode)) return undefined
    const userId = await requireUserId()
    const cached = readCache(userId).find((mapping) => mapping.barcode === barcode)
    if (cached) return cached
    const { data, error } = await supabase.from('wine_barcodes').select('*').eq('barcode', barcode).maybeSingle()
    if (error) throw new RepositoryError('Kunde inte slå upp streckkoden.', error)
    if (!data) return undefined
    const mapping = toDomain(data)
    writeCache(userId, [...readCache(userId).filter((item) => item.barcode !== barcode), mapping])
    return mapping
  }

  async addMapping(value: string, wineId: string, source: WineBarcodeSource): Promise<WineBarcode> {
    const barcode = normalizeEan(value)
    if (!isValidEan(barcode)) throw new RepositoryError('Streckkoden är inte en giltig EAN.')
    const userId = await requireUserId()
    const { data, error } = await supabase.from('wine_barcodes').upsert({
      user_id: userId, wine_id: wineId, barcode, source,
    }, { onConflict: 'user_id,barcode' }).select('*').single()
    if (error) throw new RepositoryError('Kunde inte spara streckkodskopplingen.', error)
    const mapping = toDomain(data)
    writeCache(userId, [...readCache(userId).filter((item) => item.barcode !== barcode), mapping])
    return mapping
  }

  async removeMapping(value: string): Promise<void> {
    const barcode = normalizeEan(value)
    const userId = await requireUserId()
    const { error } = await supabase.from('wine_barcodes').delete().eq('barcode', barcode)
    if (error) throw new RepositoryError('Kunde inte ta bort streckkodskopplingen.', error)
    writeCache(userId, readCache(userId).filter((item) => item.barcode !== barcode))
  }

  async findForWine(wineId: string): Promise<WineBarcode[]> {
    const userId = await requireUserId()
    const { data, error } = await supabase.from('wine_barcodes').select('*').eq('wine_id', wineId).order('created_at')
    if (error) throw new RepositoryError('Kunde inte läsa vinets streckkoder.', error)
    const mappings = data.map(toDomain)
    const others = readCache(userId).filter((item) => item.wineId !== wineId)
    writeCache(userId, [...others, ...mappings])
    return mappings
  }
}
