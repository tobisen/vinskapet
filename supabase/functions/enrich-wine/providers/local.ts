import { LocalWineEnrichmentProvider as LocalRules } from '../../../../src/domain/enrichment/LocalWineEnrichmentProvider.ts'
import type { WineCandidate, WineEnrichment } from '../../_shared/wine-enrichment.ts'
import type { WineEnrichmentProvider } from './provider.ts'

export class LocalWineEnrichmentProvider implements WineEnrichmentProvider {
  private readonly rules = new LocalRules()

  async enrich(wine: WineCandidate): Promise<WineEnrichment> {
    return this.rules.enrich(wine)
  }
}
