import { describe, expect, it } from 'vitest'
import type { InventoryRow } from '@/types/database'
import { selectFifoInventory } from './fifo'

const row = (id: string, quantity: number, purchaseDate: string | null, createdAt: string): InventoryRow => ({
  id, user_id: 'user-1', wine_id: 'wine-1', quantity, purchase_price: 200, currency: 'SEK',
  purchase_date: purchaseDate, purchase_location: null, storage_location: 'WINE_FRIDGE', notes: null,
  created_at: createdAt, updated_at: createdAt,
})

describe('FIFO inventory selection', () => {
  it('selects the oldest purchase that still has bottles', () => {
    const selected = selectFifoInventory([
      row('new', 3, '2026-06-01', '2026-06-01T10:00:00Z'),
      row('empty-old', 0, '2024-01-01', '2024-01-01T10:00:00Z'),
      row('old', 2, '2025-02-01', '2025-02-01T10:00:00Z'),
    ])
    expect(selected?.id).toBe('old')
  })

  it('uses created time when purchase date is missing', () => {
    expect(selectFifoInventory([
      row('later', 1, null, '2026-04-01T10:00:00Z'),
      row('earlier', 1, null, '2026-03-01T10:00:00Z'),
    ])?.id).toBe('earlier')
  })

  it('returns undefined at zero inventory', () => {
    expect(selectFifoInventory([row('empty', 0, '2025-01-01', '2025-01-01T10:00:00Z')])).toBeUndefined()
  })
})
