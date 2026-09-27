export type WineType = 'RED' | 'WHITE' | 'ROSE' | 'SPARKLING_WHITE' | 'SPARKLING_ROSE' | 'ORANGE' | 'DESSERT' | 'FORTIFIED'

export interface SystembolagetResult {
  externalId: string
  source: 'SYSTEMBOLAGET'
  producer?: string
  name: string
  vintage?: number
  country?: string
  region?: string
  appellation?: string
  wineType?: WineType
  grapes?: string[]
  alcoholPercentage?: number
  imageUrl?: string
  productNumber: string
  productUrl: string
  referencePrice?: number
  currency: 'SEK'
  servingTemperatureMin?: number
  servingTemperatureMax?: number
  foodPairings?: string[]
  description?: string
}

interface ProductData {
  productId?: string
  productNumber?: string
  productNumberShort?: string
  productNameBold?: string
  productNameThin?: string
  producerName?: string
  vintage?: string
  country?: string
  originLevel1?: string
  originLevel2?: string
  categoryLevel1?: string
  categoryLevel2?: string
  customCategoryTitle?: string
  grapes?: string
  rawMaterial?: string
  alcoholPercentage?: number
  priceInclVat?: number
  usage?: string
  tasteSymbolsList?: string[]
  taste?: string
  images?: Array<{ imageUrl?: string }>
}

const PRODUCT_URL_PATTERN = /https:\/\/www\.systembolaget\.se\/produkt\/vin\/[a-z0-9%_-]+-(\d+)\//gi

export const normalizeSearchText = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('sv-SE')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

export const normalizeProductNumber = (value: string): string => value.replace(/\D/g, '')

export interface WineSearchHints {
  name: string
  producer?: string
  productNumber?: string
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

export function findCandidatePaths(paths: Iterable<string>, query: string, limit = 8): string[] {
  const normalizedQuery = normalizeSearchText(query)
  const productNumber = normalizeProductNumber(query)
  const numericQuery = productNumber.length >= 5 && /^[\d\s-]+$/.test(query)
  const tokens = normalizedQuery.split(' ').filter((token) => token.length > 1)
  const matches: Array<{ url: string; score: number }> = []

  for (const path of paths) {
    const url = path.startsWith('http') ? path : `https://www.systembolaget.se${path}`
    const urlProductNumber = url.match(/-(\d+)\/$/)?.[1] ?? ''
    if (numericQuery) {
      if (urlProductNumber === productNumber || urlProductNumber.startsWith(productNumber)) {
        matches.push({ url, score: urlProductNumber === productNumber ? 100 : 80 })
      }
      continue
    }

    const slug = normalizeSearchText(new URL(url).pathname.replace(/-\d+\/$/, ''))
    const matchedTokens = tokens.filter((token) => slug.includes(token)).length
    if (tokens.length && matchedTokens === tokens.length) matches.push({ url, score: matchedTokens * 10 - slug.length / 1000 })
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit).map(({ url }) => url)
}

export function findCandidateUrls(sitemap: string, query: string, limit = 8): string[] {
  return findCandidatePaths([...sitemap.matchAll(PRODUCT_URL_PATTERN)].map((match) => match[0]), query, limit)
}

export function findWineCandidatePaths(paths: Iterable<string>, hints: WineSearchHints, limit = 10): string[] {
  const allPaths = [...paths]
  const words = (value?: string) => normalizeSearchText(value ?? '')
    .split(' ')
    .filter((word) => word.length > 2)
  const candidates = [
    ...(hints.productNumber ? findCandidatePaths(allPaths, hints.productNumber, 2) : []),
    ...findCandidatePaths(allPaths, hints.name, 6),
    ...(hints.producer ? findCandidatePaths(allPaths, hints.producer, 4) : []),
    ...words(hints.producer).flatMap((word) => findCandidatePaths(allPaths, word, 2)),
    ...words(hints.name).flatMap((word) => findCandidatePaths(allPaths, word, 2)),
  ]

  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    if (seen.has(candidate)) return false
    seen.add(candidate)
    return true
  }).slice(0, limit)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function mapWineType(product: ProductData): WineType | undefined {
  const category = normalizeSearchText(`${product.categoryLevel2 ?? ''} ${product.customCategoryTitle ?? ''}`)
  if (category.includes('mousserande rose')) return 'SPARKLING_ROSE'
  if (category.includes('mousserande')) return 'SPARKLING_WHITE'
  if (category.includes('rose')) return 'ROSE'
  if (category.includes('orange')) return 'ORANGE'
  if (category.includes('starkvin')) return 'FORTIFIED'
  if (category.includes('dessert') || category.includes('sott vin')) return 'DESSERT'
  if (category.includes('rott vin')) return 'RED'
  if (category.includes('vitt vin')) return 'WHITE'
  return undefined
}

function parseGrapes(product: ProductData): string[] | undefined {
  const value = optionalString(product.grapes) ?? optionalString(product.rawMaterial)
  if (!value) return undefined
  const grapes = value
    .replace(/\.$/, '')
    .split(/[,;]|\s+och\s+/i)
    .map((grape) => grape.replace(/^\s*\d+(?:[.,]\d+)?\s*%\s*/, '').trim())
    .filter(Boolean)
  return grapes.length ? unique(grapes) : undefined
}

export function parseServingTemperature(usage?: string): { min?: number; max?: number } {
  if (!usage) return {}
  const range = usage.match(/(\d{1,2})\s*(?:-|–|—|till)\s*(\d{1,2})\s*°?\s*c/i)
  if (range) return { min: Number(range[1]), max: Number(range[2]) }
  const single = usage.match(/(?:cirka\s*)?(\d{1,2})\s*°\s*c/i)
  return single ? { min: Number(single[1]), max: Number(single[1]) } : {}
}

function productFromNextData(nextData: unknown): ProductData | undefined {
  if (!nextData || typeof nextData !== 'object') return undefined
  const props = (nextData as { props?: { pageProps?: { fallback?: Record<string, unknown> } } }).props
  const fallback = props?.pageProps?.fallback
  if (!fallback) return undefined
  const entry = Object.entries(fallback).find(([key, value]) => key.includes('"ecommerce","product"') && value && typeof value === 'object')
  return entry?.[1] as ProductData | undefined
}

export function parseProductHtml(html: string, productUrl: string): SystembolagetResult | null {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!match?.[1]) return null

  let product: ProductData | undefined
  try {
    product = productFromNextData(JSON.parse(match[1]))
  } catch {
    return null
  }
  if (!product?.productNumber || !product.productNameBold || normalizeSearchText(product.categoryLevel1 ?? '') !== 'vin') return null

  const temperature = parseServingTemperature(product.usage)
  const imageBase = product.images?.find((image) => image.imageUrl)?.imageUrl
  const vintage = Number.parseInt(product.vintage ?? '', 10)
  return {
    externalId: product.productId ?? product.productNumber,
    source: 'SYSTEMBOLAGET',
    producer: optionalString(product.producerName) ?? optionalString(product.productNameThin),
    name: product.productNameBold.trim(),
    vintage: Number.isFinite(vintage) ? vintage : undefined,
    country: optionalString(product.country),
    region: optionalString(product.originLevel1),
    appellation: optionalString(product.originLevel2),
    wineType: mapWineType(product),
    grapes: parseGrapes(product),
    alcoholPercentage: typeof product.alcoholPercentage === 'number' ? product.alcoholPercentage : undefined,
    imageUrl: imageBase ? `${imageBase}_400.png` : undefined,
    productNumber: product.productNumber,
    productUrl,
    referencePrice: typeof product.priceInclVat === 'number' ? product.priceInclVat : undefined,
    currency: 'SEK',
    servingTemperatureMin: temperature.min,
    servingTemperatureMax: temperature.max,
    foodPairings: product.tasteSymbolsList?.filter(Boolean),
    description: optionalString(product.taste),
  }
}
