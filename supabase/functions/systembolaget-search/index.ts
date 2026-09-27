import wineIndex from '../_shared/systembolaget-wine-index.json' with { type: 'json' }
import { findCandidatePaths, findCandidateUrls, findWineCandidatePaths, normalizeProductNumber, parseProductHtml, type SystembolagetResult, type WineSearchHints } from '../_shared/systembolaget.ts'

const SITEMAP_URL = 'https://www.systembolaget.se/sitemap-produkter-vin.xml'
const USER_AGENT = 'Vinskapet/0.1 (private, on-demand product lookup)'
const SITEMAP_TTL_MS = 6 * 60 * 60 * 1000
const PRODUCT_TTL_MS = 24 * 60 * 60 * 1000
const MAX_REQUESTS_PER_MINUTE = 20

let sitemapCache: { value: string; expiresAt: number } | undefined
let sitemapPending: Promise<string> | undefined
const productCache = new Map<string, { value: SystembolagetResult | null; expiresAt: number }>()
const productPending = new Map<string, Promise<SystembolagetResult | null>>()
const requestWindows = new Map<string, number[]>()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function rateLimited(identity: string): boolean {
  const now = Date.now()
  const recent = (requestWindows.get(identity) ?? []).filter((timestamp) => now - timestamp < 60_000)
  recent.push(now)
  requestWindows.set(identity, recent)
  return recent.length > MAX_REQUESTS_PER_MINUTE
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xml;q=0.9' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`)
  return response.text()
}

async function getSitemap(): Promise<string> {
  const now = Date.now()
  if (sitemapCache && sitemapCache.expiresAt > now) return sitemapCache.value
  if (!sitemapPending) {
    sitemapPending = fetchText(SITEMAP_URL).then((value) => {
      sitemapCache = { value, expiresAt: Date.now() + SITEMAP_TTL_MS }
      return value
    }).finally(() => { sitemapPending = undefined })
  }
  return sitemapPending
}

async function getProduct(url: string): Promise<SystembolagetResult | null> {
  const now = Date.now()
  const cached = productCache.get(url)
  if (cached && cached.expiresAt > now) return cached.value
  const pending = productPending.get(url)
  if (pending) return pending
  const request = fetchText(url).then((html) => {
    const value = parseProductHtml(html, url)
    productCache.set(url, { value, expiresAt: Date.now() + PRODUCT_TTL_MS })
    return value
  }).finally(() => { productPending.delete(url) })
  productPending.set(url, request)
  return request
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('authorization')
  if (!authorization) return json({ error: 'Unauthorized' }, 401)
  if (rateLimited(authorization.slice(-32))) return json({ error: 'För många sökningar. Vänta en minut och försök igen.' }, 429)

  let query = ''
  let wine: WineSearchHints | undefined
  try {
    const body = await request.json() as { query?: unknown, wine?: Record<string, unknown> }
    query = typeof body.query === 'string' ? body.query.trim().slice(0, 100) : ''
    if (body.wine && typeof body.wine.name === 'string') {
      wine = {
        name: body.wine.name.trim().slice(0, 100),
        producer: typeof body.wine.producer === 'string' ? body.wine.producer.trim().slice(0, 100) : undefined,
        productNumber: typeof body.wine.productNumber === 'string' ? body.wine.productNumber.trim().slice(0, 30) : undefined,
      }
    }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  if (query.length < 2 && (!wine || wine.name.length < 2)) return json({ results: [] })

  try {
    let urls = wine
      ? findWineCandidatePaths(wineIndex.paths, wine)
      : findCandidatePaths(wineIndex.paths, query)
    if (!urls.length) {
      const sitemap = await getSitemap()
      urls = wine
        ? findWineCandidatePaths([...sitemap.matchAll(/https:\/\/www\.systembolaget\.se\/produkt\/vin\/[a-z0-9%_-]+-\d+\//gi)].map((match) => match[0]), wine)
        : findCandidateUrls(sitemap, query)
    }
    const products = (await Promise.all(urls.map((url) => getProduct(url)))).filter((product): product is SystembolagetResult => product !== null)
    const productNumber = normalizeProductNumber(wine?.productNumber ?? query)
    if (productNumber.length >= 5) {
      products.sort((a, b) => Number(b.productNumber === productNumber) - Number(a.productNumber === productNumber))
    }
    return json({ results: products })
  } catch (error) {
    console.error('Systembolaget lookup failed', error)
    return json({ error: 'Kunde inte söka hos Systembolaget just nu.' }, 502)
  }
})
