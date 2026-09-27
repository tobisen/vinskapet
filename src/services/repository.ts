import { SupabaseInventoryRepository } from '@/repositories/supabase/SupabaseInventoryRepository'
import { SupabaseTastingsRepository } from '@/repositories/supabase/SupabaseTastingsRepository'
import { SupabaseWineRepository } from '@/repositories/supabase/SupabaseWineRepository'
import { SupabaseWineBarcodeRepository } from '@/repositories/supabase/SupabaseWineBarcodeRepository'

export const repositories = {
  wines: new SupabaseWineRepository(),
  inventory: new SupabaseInventoryRepository(),
  tastings: new SupabaseTastingsRepository(),
  barcodes: new SupabaseWineBarcodeRepository(),
}
