import { supabase } from '@/services/supabase'
import { LocalWineEnrichmentProvider } from '@/domain/enrichment/LocalWineEnrichmentProvider'
import type { Wine } from '@/types/domain'
import type {
  WineCandidate,
  WineEnrichment,
  WineEnrichmentReport,
  WineEnrichmentService,
} from '@/types/search'
import { isWineEnrichment, mergeWineEnrichment } from '@/utils/wineEnrichment'

export class WineEnrichmentUnavailableError extends Error {
  constructor() {
    super('Automatisk komplettering är inte aktiverad ännu.')
    this.name = 'WineEnrichmentUnavailableError'
  }
}

export class SupabaseEdgeWineEnrichmentService implements WineEnrichmentService {
  readonly assessmentSource = 'Local rules'

  async enrich(wine: WineCandidate): Promise<WineEnrichment> {
    const { data, error } = await supabase.functions.invoke('enrich-wine', { body: { wine } })
    if (error) {
      const context = 'context' in error ? error.context : undefined
      if (context instanceof Response) {
        const body = await context.clone().json().catch(() => undefined) as { code?: string } | undefined
        if (body?.code === 'PROVIDER_NOT_CONFIGURED') throw new WineEnrichmentUnavailableError()
      }
      throw new Error(`Metadata enrichment misslyckades: ${error.message}`)
    }
    const enrichment = data && typeof data === 'object' && 'enrichment' in data
      ? (data as { enrichment: unknown }).enrichment
      : data
    if (!isWineEnrichment(enrichment)) throw new Error('Metadata enrichment returnerade ett ogiltigt svar.')
    return enrichment
  }
}

export const wineEnrichmentService: WineEnrichmentService = new LocalWineEnrichmentProvider()

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
    imageUrl: wine.image,
    productNumber: wine.systembolagetProductNumber,
    productUrl: wine.systembolagetUrl,
    referencePrice: wine.referencePrice,
    currency: wine.currency,
    storagePotential: wine.storagePotential,
    drinkingWindowStart: wine.drinkingWindowStart,
    drinkingWindowEnd: wine.drinkingWindowEnd,
    optimalDrinkingStart: wine.optimalDrinkingStart,
    optimalDrinkingEnd: wine.optimalDrinkingEnd,
    servingTemperatureMin: wine.servingTemperatureMin,
    servingTemperatureMax: wine.servingTemperatureMax,
    foodPairings: wine.foodPairings,
    description: wine.description,
  }
}

export async function enrichWineRecord(
  wine: Wine,
  service: WineEnrichmentService,
  updateWine: (wine: Wine) => Promise<Wine>,
): Promise<WineEnrichmentReport> {
  const enrichment = await service.enrich(wineToEnrichmentCandidate(wine))
  const result = mergeWineEnrichment(wine, enrichment, service.assessmentSource ?? 'Local rules')
  if (result.report.completedFields.length) await updateWine(result.wine)
  return result.report
}
