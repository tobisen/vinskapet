import { describe, expect, it } from 'vitest'
import type { WineSummary } from '@/types/domain'
import { exportWinesToCsv, parseCsv, previewWineCsvImport } from './wineCsv'

const wine: WineSummary = {
  id: 'wine-1', producer: 'Ch. Plince', name: 'Château Plince', vintage: 2018, country: 'Frankrike',
  region: 'Bordeaux', appellation: 'Pomerol', wineType: 'RED', grapes: ['Merlot', 'Cabernet franc'],
  foodPairings: ['Nötkött'], currency: 'SEK', status: 'COLLECTION', description: 'Mogen, nyanserad.',
  createdAt: '2026-01-01', updatedAt: '2026-01-02', quantity: 2, averagePrice: 399,
  storageLocations: ['WINE_FRIDGE'], tastingCount: 0,
}

describe('wine CSV transfer', () => {
  it('exports stable IDs, metadata and read-only collection values', () => {
    const rows = parseCsv(exportWinesToCsv([wine]))
    expect(rows[0]).toContain('wine_id')
    expect(rows[1]).toContain('wine-1')
    expect(rows[1]).toContain('Merlot | Cabernet franc')
    expect(rows[1]).toContain('2')
  })

  it('parses quoted commas, quotes and line breaks', () => {
    expect(parseCsv('wine_id,description\r\nwine-1,"Mogen, ""fin""\noch lång"')).toEqual([
      ['wine_id', 'description'],
      ['wine-1', 'Mogen, "fin"\noch lång'],
    ])
  })

  it('updates by ID, preserves blank cells and ignores inventory columns', () => {
    const preview = previewWineCsvImport('wine_id,description,grapes,quantity\nwine-1,"Ny text",,99', [wine])
    expect(preview.errors).toEqual([])
    expect(preview.updates[0]?.wine).toMatchObject({ id: 'wine-1', description: 'Ny text', grapes: wine.grapes, quantity: 2 })
    expect(preview.updates[0]?.changedFields).toEqual(['description'])
  })

  it('updates and validates desired wishlist quantity', () => {
    const updated = previewWineCsvImport('wine_id,wishlist_quantity\nwine-1,4', [wine])
    expect(updated.errors).toEqual([])
    expect(updated.updates[0]?.wine.wishlistQuantity).toBe(4)

    const invalid = previewWineCsvImport('wine_id,wishlist_quantity\nwine-1,0', [wine])
    expect(invalid.errors[0]).toContain('större än 0')
  })

  it('blocks unknown and duplicate IDs', () => {
    const preview = previewWineCsvImport('wine_id,name\nmissing,Nytt\nwine-1,Nytt\nwine-1,Igen', [wine])
    expect(preview.errors).toHaveLength(2)
    expect(preview.errors.join(' ')).toContain('finns inte')
    expect(preview.errors.join(' ')).toContain('flera gånger')
  })
})
