import { parseOpenFoodFactsProduct } from '../_shared/open-food-facts.ts'

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

  try {
    const fields = 'code,product_name,product_name_sv,brands,countries,categories_tags,image_front_url,image_url'
    const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${barcode}?fields=${fields}`, {
      headers: { 'User-Agent': 'Vinskapet/0.1 (https://github.com/tobisen/vinskapet)' },
      signal: AbortSignal.timeout(10_000),
    })
    if (response.status === 404) return json({ result: null })
    if (!response.ok) return json({ error: `Open Food Facts returned ${response.status}` }, 502)
    const payload = await response.json() as { product?: Record<string, unknown> }
    return json({ result: parseOpenFoodFactsProduct(payload, barcode) })
  } catch (error) {
    console.error('Open Food Facts lookup failed', error)
    return json({ error: 'Kunde inte slå upp streckkoden just nu.' }, 502)
  }
})
