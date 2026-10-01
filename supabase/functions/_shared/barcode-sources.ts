interface ExternalBarcodeResult {
  externalId: string
  source: 'PRODUCT_GURU' | 'GTIN_HUB'
  producer?: string
  name: string
  vintage?: number
  country?: string
  region?: string
  imageUrl?: string
  productUrl?: string
  description?: string
  currency: 'SEK'
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function productIdentity(rawName: string): { name: string; vintage?: number; region?: string } {
  const vintageMatch = rawName.match(/\b(?:19|20)\d{2}\b/)
  const parts = rawName.split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter((part) => part && !/^\d+(?:[.,]\d+)?\s*(?:ml|cl|l)$/i.test(part))
  const identity = [...parts]
    .sort((a, b) => b.replace(/\b(?:19|20)\d{2}\b/g, '').trim().length - a.replace(/\b(?:19|20)\d{2}\b/g, '').trim().length)[0]
    ?? rawName
  const name = identity.replace(/\b(?:19|20)\d{2}\b/g, '').replace(/\s+/g, ' ').trim()
  const region = parts.length > 1 && parts[0] !== identity ? parts[0] : undefined
  return { name: name || rawName, vintage: vintageMatch ? Number(vintageMatch[0]) : undefined, region }
}

export function parseProductGuruProduct(payload: unknown, barcode: string): ExternalBarcodeResult | null {
  if (!payload || typeof payload !== 'object') return null
  const product = payload as Record<string, unknown>
  const rawName = optionalString(product.name)
  if (!rawName) return null
  const identity = productIdentity(rawName)
  return {
    externalId: barcode,
    source: 'PRODUCT_GURU',
    producer: optionalString(product.brand),
    name: identity.name,
    vintage: identity.vintage,
    country: optionalString(product.country_of_origin),
    region: identity.region,
    imageUrl: optionalString(product.image_url),
    productUrl: optionalString(product.web_url),
    currency: 'SEK',
  }
}

export function parseGtinHubProduct(payload: unknown, barcode: string): ExternalBarcodeResult | null {
  if (!payload || typeof payload !== 'object') return null
  const response = payload as Record<string, unknown>
  if (response.found !== true || !response.product || typeof response.product !== 'object') return null
  const product = response.product as Record<string, unknown>
  const rawData = product.raw_data && typeof product.raw_data === 'object' ? product.raw_data as Record<string, unknown> : undefined
  const rawProduct = rawData?.product && typeof rawData.product === 'object' ? rawData.product as Record<string, unknown> : undefined
  const rawName = optionalString(product.name) ?? optionalString(rawProduct?.name)
  if (!rawName) return null
  const identity = productIdentity(rawName)
  const description = optionalString(product.description)
  return {
    externalId: barcode,
    source: 'GTIN_HUB',
    producer: optionalString(product.brand) ?? optionalString(rawProduct?.brand),
    name: identity.name,
    vintage: identity.vintage,
    region: identity.region,
    imageUrl: optionalString(product.image_url) ?? optionalString(rawProduct?.imageUrl),
    description: description === 'No description found.' ? undefined : description,
    currency: 'SEK',
  }
}
