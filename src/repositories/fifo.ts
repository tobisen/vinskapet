import type { InventoryRow } from '@/types/database'

export function selectFifoInventory(rows: InventoryRow[]): InventoryRow | undefined {
  return [...rows]
    .filter((row) => row.quantity > 0)
    .sort((a, b) => {
      const aDate = a.purchase_date ?? a.created_at
      const bDate = b.purchase_date ?? b.created_at
      return aDate.localeCompare(bDate) || a.created_at.localeCompare(b.created_at)
    })[0]
}
