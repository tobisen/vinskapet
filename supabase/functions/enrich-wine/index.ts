import { isWineCandidate, isWineEnrichment } from '../_shared/wine-enrichment.ts'
import { getWineEnrichmentProvider, ProviderNotConfiguredError } from './providers/provider.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const requestWindows = new Map<string, number[]>()

function rateLimited(identity: string): boolean {
  const now = Date.now()
  const recent = (requestWindows.get(identity) ?? []).filter((timestamp) => now - timestamp < 60_000)
  recent.push(now)
  requestWindows.set(identity, recent)
  return recent.length > 10
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const authorization = request.headers.get('authorization')
  if (!authorization) return json({ error: 'Unauthorized' }, 401)
  if (rateLimited(authorization.slice(-32))) return json({ error: 'För många enrichment-anrop. Vänta en minut.' }, 429)

  let wine: unknown
  try {
    wine = (await request.json() as { wine?: unknown }).wine
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  if (!isWineCandidate(wine)) return json({ error: 'Ogiltig WineCandidate.' }, 400)

  try {
    const enrichment = await getWineEnrichmentProvider(Deno.env.get('WINE_ENRICHMENT_PROVIDER')).enrich(wine)
    if (!isWineEnrichment(enrichment)) return json({ error: 'Providern returnerade ogiltig enrichment.' }, 502)
    return json({ enrichment })
  } catch (error) {
    if (error instanceof ProviderNotConfiguredError) {
      return json({ code: 'PROVIDER_NOT_CONFIGURED', error: error.message }, 503)
    }
    console.error('Wine enrichment failed', error)
    return json({ error: 'Kunde inte komplettera vinets metadata.' }, 502)
  }
})
