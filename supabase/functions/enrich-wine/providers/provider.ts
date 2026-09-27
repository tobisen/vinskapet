import type { WineCandidate, WineEnrichment } from '../../_shared/wine-enrichment.ts'
import { LocalWineEnrichmentProvider } from './local.ts'

export interface WineEnrichmentProvider {
  enrich(wine: WineCandidate): Promise<WineEnrichment>
}

export class ProviderNotConfiguredError extends Error {
  constructor() {
    super('Ingen Wine Enrichment-provider är konfigurerad.')
    this.name = 'ProviderNotConfiguredError'
  }
}

export function getWineEnrichmentProvider(providerName?: string): WineEnrichmentProvider {
  if (!providerName || providerName === 'local') return new LocalWineEnrichmentProvider()
  if (providerName === 'disabled') throw new ProviderNotConfiguredError()
  throw new Error(`Okänd Wine Enrichment-provider: ${providerName}`)
}
