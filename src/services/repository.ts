import { SupabaseInventoryRepository } from '@/repositories/supabase/SupabaseInventoryRepository'
import { SupabaseTastingsRepository } from '@/repositories/supabase/SupabaseTastingsRepository'
import { SupabaseWineRepository } from '@/repositories/supabase/SupabaseWineRepository'

export const repositories = {
  wines: new SupabaseWineRepository(),
  inventory: new SupabaseInventoryRepository(),
  tastings: new SupabaseTastingsRepository(),
}
