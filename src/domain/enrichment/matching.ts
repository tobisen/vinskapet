import type { EnrichmentContext, LocalWineCandidate } from './types'

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('sv-SE')
}

export function createEnrichmentContext(wine: LocalWineCandidate): EnrichmentContext {
  return {
    wine,
    text: normalize([wine.producer, wine.name, wine.country, wine.region, wine.appellation].filter(Boolean).join(' ')),
    grapes: normalize((wine.grapes ?? []).join(' ')),
  }
}

export function matches(context: EnrichmentContext, ...terms: string[]): boolean {
  return terms.some((term) => context.text.includes(normalize(term)) || context.grapes.includes(normalize(term)))
}

export function hasText(context: EnrichmentContext, ...terms: string[]): boolean {
  return terms.some((term) => context.text.includes(normalize(term)))
}
