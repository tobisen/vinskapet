import { supabase } from '@/services/supabase'
import type { Wine } from '@/types/domain'
import type {
  WineCandidate,
  WineEnrichment,
  WineEnrichmentReport,
  WineEnrichmentService,
} from '@/types/search'
import { isWineEnrichment, mergeWineEnrichment } from '@/utils/wineEnrichment'

export class SupabaseEdgeWineEnrichmentService implements WineEnrichmentService {
  async enrich(wine: WineCandidate): Promise<WineEnrichment> {
    const { data, error } = await supabase.functions.invoke('enrich-wine', { body: { wine } })
    if (error) throw new Error(`Metadata enrichment misslyckades: ${error.message}`)
    const enrichment = data && typeof data === 'object' && 'enrichment' in data
      ? (data as { enrichment: unknown }).enrichment
      : data
    if (!isWineEnrichment(enrichment)) throw new Error('Metadata enrichment returnerade ett ogiltigt svar.')
    return enrichment
  }
}

export function wineToEnrichmentCandidate(wine: Wine): WineCandidate {
  return {
    externalId: wine.id,
    source: 'COLLECTION',
    producer: wine.producer,
    name: wine.name,
    vintage: wine.vintage,
    country: wine.country,
    region: wine.region,
    appellation: wine.appellation,
    wineType: wine.wineType,
    grapes: wine.grapes,
    alcoholPercentage: wine.alcoholPercentage,
    productNumber: wine.systembolagetProductNumber,
    productUrl: wine.systembolagetUrl,
  }
}

export async function enrichWineRecord(
  wine: Wine,
  service: WineEnrichmentService,
  updateWine: (wine: Wine) => Promise<Wine>,
): Promise<WineEnrichmentReport> {
  const enrichment = await service.enrich(wineToEnrichmentCandidate(wine))
  const result = mergeWineEnrichment(wine, enrichment, 'EDGE_FUNCTION')
  if (result.report.completedFields.length) await updateWine(result.wine)
  return result.report
}
