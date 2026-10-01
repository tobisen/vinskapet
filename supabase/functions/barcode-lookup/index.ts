import { parseOpenFoodFactsProduct } from '../_shared/open-food-facts.ts'
import { parseGtinHubProduct, parseProductGuruProduct } from '../_shared/barcode-sources.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const requestWindows = new Map<string, number[]>()

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function validEan(value: string): boolean {
  if (!/^\d{8}$|^\d{13}$/.test(value)) return false
  const digits = [...value].map(Number)
  const checkDigit = digits.pop()
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === checkDigit
}

function rateLimited(identity: string): boolean {
  const now = Date.now()
  const recent = (requestWindows.get(identity) ?? []).filter((timestamp) => now - timestamp < 60_000)
  recent.push(now)
  requestWindows.set(identity, recent)
  return recent.length > 12
}

async function fetchJson(url: string, source: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Vinskapet/0.1 (https://github.com/tobisen/vinskapet)' },
      signal: AbortSignal.timeout(7_000),
    })
    if (response.status === 404) {
      console.info(`barcode-lookup ${source} miss`, { status: response.status })
      return null
    }
    if (!response.ok) {
      console.warn(`barcode-lookup ${source} unavailable`, { status: response.status })
      return null
    }
    return await response.json()
  } catch (error) {
    console.warn(`barcode-lookup ${source} failed`, error)
    return null
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const authorization = request.headers.get('authorization')
  if (!authorization) return json({ error: 'Unauthorized' }, 401)
  if (rateLimited(authorization.slice(-32))) return json({ error: 'För många streckkodssökningar. Vänta en minut.' }, 429)

  let barcode = ''
  try {
    const body = await request.json() as { barcode?: unknown }
    barcode = typeof body.barcode === 'string' ? body.barcode.trim() : ''
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  if (!validEan(barcode)) return json({ error: 'Ogiltig EAN.' }, 400)

  console.info('barcode-lookup input', { barcode })

  try {
    const fields = 'code,product_name,product_name_sv,brands,countries,categories_tags,image_front_url,image_url'
    const openFoodFactsPayload = await fetchJson(`https://world.openfoodfacts.org/api/v3/product/${barcode}?fields=${fields}`, 'Open Food Facts')
    const openFoodFactsResult = parseOpenFoodFactsProduct((openFoodFactsPayload ?? {}) as { product?: Record<string, unknown> }, barcode)
    console.info('barcode-lookup Open Food Facts result', {
      barcode,
      matched: Boolean(openFoodFactsResult),
      product: openFoodFactsResult ? { name: openFoodFactsResult.name, producer: openFoodFactsResult.producer, wineType: openFoodFactsResult.wineType } : undefined,
    })
    if (openFoodFactsResult) return json({ result: openFoodFactsResult })

    const productGuruPayload = await fetchJson(`https://product-guru.org/lookup/${barcode}.json`, 'ProductGuru')
    const productGuruResult = parseProductGuruProduct(productGuruPayload, barcode)
    console.info('barcode-lookup ProductGuru result', { barcode, matched: Boolean(productGuruResult), product: productGuruResult })
    if (productGuruResult) return json({ result: productGuruResult })

    const gtinHubPayload = await fetchJson(`https://gtinhub.com/api/v1/product/${barcode}`, 'GTINHub')
    const gtinHubResult = parseGtinHubProduct(gtinHubPayload, barcode)
    console.info('barcode-lookup GTINHub result', { barcode, matched: Boolean(gtinHubResult), product: gtinHubResult })
    return json({ result: gtinHubResult })
  } catch (error) {
    console.error('Free barcode lookup failed', error)
    return json({ error: 'Kunde inte slå upp streckkoden just nu.' }, 502)
  }
})
