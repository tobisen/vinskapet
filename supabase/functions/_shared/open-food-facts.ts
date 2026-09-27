interface OpenFoodFactsPayload {
  product?: Record<string, unknown>
}

function wineType(categories: string[]): string | undefined {
  const value = categories.join(' ').toLowerCase()
  if (value.includes('sparkling') || value.includes('champagne')) return value.includes('rose') ? 'SPARKLING_ROSE' : 'SPARKLING_WHITE'
  if (value.includes('rose-wine') || value.includes('rose-wines')) return 'ROSE'
  if (value.includes('red-wine') || value.includes('red-wines')) return 'RED'
  if (value.includes('white-wine') || value.includes('white-wines')) return 'WHITE'
  return undefined
}

export function parseOpenFoodFactsProduct(payload: OpenFoodFactsPayload, barcode: string): Record<string, unknown> | null {
  const product = payload.product
  if (!product) return null
  const categories = Array.isArray(product.categories_tags) ? product.categories_tags.filter((item): item is string => typeof item === 'string') : []
  if (!categories.some((category) => /wine|champagne/i.test(category))) return null
  const name = String(product.product_name_sv || product.product_name || '').trim()
  if (!name) return null
  const vintageMatch = name.match(/\b(19|20)\d{2}\b/)
  return {
    externalId: barcode,
    source: 'OPEN_FOOD_FACTS',
    producer: String(product.brands || '').split(',')[0]?.trim() || undefined,
    name,
    vintage: vintageMatch ? Number(vintageMatch[0]) : undefined,
    country: String(product.countries || '').split(',')[0]?.trim() || undefined,
    wineType: wineType(categories),
    imageUrl: String(product.image_front_url || product.image_url || '').trim() || undefined,
    currency: 'SEK',
  }
}
