import { existsSync } from 'node:fs'
import process from 'node:process'

const fields = {
  grapes: 'grapes',
  storagePotential: 'storage_potential',
  drinkingWindowStart: 'drinking_window_start',
  drinkingWindowEnd: 'drinking_window_end',
  optimalDrinkingStart: 'optimal_drinking_start',
  optimalDrinkingEnd: 'optimal_drinking_end',
  servingTemperatureMin: 'serving_temperature_min',
  servingTemperatureMax: 'serving_temperature_max',
  foodPairings: 'food_pairings',
  description: 'description',
}

const isMissing = (value) => value == null || value === '' || (Array.isArray(value) && value.length === 0)
const missingFields = (wine) => Object.entries(fields).filter(([, column]) => isMissing(wine[column])).map(([field]) => field)
const isStringList = (value) => Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.trim())

function validEnrichment(enrichment) {
  if (!enrichment || typeof enrichment !== 'object' || Array.isArray(enrichment)) return false
  if (!Object.keys(enrichment).every((field) => field in fields)) return false
  for (const [field, value] of Object.entries(enrichment)) {
    if (value == null) continue
    if (['grapes', 'foodPairings'].includes(field) && !isStringList(value)) return false
    if (field === 'storagePotential' && !['LOW', 'MEDIUM', 'HIGH'].includes(value)) return false
    if (['drinkingWindowStart', 'drinkingWindowEnd', 'optimalDrinkingStart', 'optimalDrinkingEnd'].includes(field) && (!Number.isInteger(value) || value < 1900 || value > 2200)) return false
    if (['servingTemperatureMin', 'servingTemperatureMax'].includes(field) && (typeof value !== 'number' || value < 0 || value > 30)) return false
    if (field === 'description' && (typeof value !== 'string' || !value.trim() || value.length > 2000)) return false
  }
  if (enrichment.drinkingWindowStart && enrichment.drinkingWindowEnd && enrichment.drinkingWindowStart > enrichment.drinkingWindowEnd) return false
  if (enrichment.optimalDrinkingStart && enrichment.optimalDrinkingEnd && enrichment.optimalDrinkingStart > enrichment.optimalDrinkingEnd) return false
  if (enrichment.servingTemperatureMin != null && enrichment.servingTemperatureMax != null && enrichment.servingTemperatureMin > enrichment.servingTemperatureMax) return false
  return true
}

function candidate(wine) {
  return {
    externalId: wine.id,
    source: 'COLLECTION',
    producer: wine.producer,
    name: wine.name,
    vintage: wine.vintage ?? undefined,
    country: wine.country ?? undefined,
    region: wine.region ?? undefined,
    appellation: wine.appellation ?? undefined,
    wineType: wine.wine_type,
    grapes: wine.grapes ?? [],
    alcoholPercentage: wine.alcohol_percentage ?? undefined,
    productNumber: wine.systembolaget_product_number ?? undefined,
    productUrl: wine.systembolaget_url ?? undefined,
  }
}

function validatedPatch(wine, enrichment) {
  if (!validEnrichment(enrichment)) {
    throw new Error('Edge Function returnerade enrichment i fel format.')
  }
  const before = missingFields(wine)
  const patch = {}
  for (const field of before) {
    const value = enrichment[field]
    if (!isMissing(value)) patch[fields[field]] = value
  }
  return { before, patch }
}

async function main() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local')
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const email = process.env.IMPORT_USER_EMAIL
  const password = process.env.IMPORT_USER_PASSWORD
  if (!url || !key || !email || !password) {
    throw new Error('Audit/enrichment kräver Supabase-konfiguration samt tillfälliga IMPORT_USER_EMAIL och IMPORT_USER_PASSWORD.')
  }

  const { createClient } = await import('@supabase/supabase-js')
  const { default: WebSocket } = await import('ws')
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket },
  })
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError || !authData.user) throw new Error(`Kunde inte autentisera användaren: ${authError?.message ?? 'okänt fel'}`)

  try {
    const { data: wines, error } = await supabase.from('wines').select('*').eq('user_id', authData.user.id).order('created_at')
    if (error) throw new Error(`Kunde inte läsa wines: ${error.message}`)

    console.log(`Wine metadata audit: ${wines.length} wines`)
    for (const wine of wines) console.log(`- ${wine.producer} ${wine.name} ${wine.vintage ?? 'NV'}: ${missingFields(wine).join(', ') || 'complete'}`)
    const incomplete = wines.filter((wine) => missingFields(wine).length)
    console.log(`Incomplete wines: ${incomplete.length}`)

    if (!process.argv.includes('--apply')) {
      console.log('Audit klar. Ingen Edge Function har anropats och ingen data har ändrats.')
      return
    }
    if (process.env.CONFIRM_METADATA_ENRICHMENT !== 'ENRICH_MISSING_WINE_METADATA') {
      throw new Error('Enrichment kräver CONFIRM_METADATA_ENRICHMENT=ENRICH_MISSING_WINE_METADATA.')
    }

    for (const wine of incomplete) {
      const initialMissing = missingFields(wine)
      const { data, error: functionError } = await supabase.functions.invoke('enrich-wine', { body: { wine: candidate(wine) } })
      if (functionError) throw new Error(`Enrichment misslyckades för ${wine.name}: ${functionError.message}`)
      const enrichment = data && typeof data === 'object' && 'enrichment' in data ? data.enrichment : data
      const { data: current, error: reloadError } = await supabase.from('wines').select('*').eq('id', wine.id).eq('user_id', authData.user.id).single()
      if (reloadError) throw new Error(`Kunde inte läsa om ${wine.name}: ${reloadError.message}`)
      const { patch } = validatedPatch(current, enrichment)
      const completed = Object.keys(patch).map((column) => Object.entries(fields).find(([, value]) => value === column)?.[0])
      if (completed.length) {
        const timestamp = new Date().toISOString()
        const { data: updated, error: updateError } = await supabase.from('wines').update({
          ...patch,
          assessment_source: current.assessment_source ?? 'EDGE_FUNCTION',
          assessment_updated_at: timestamp,
          updated_at: timestamp,
        }).eq('id', wine.id).eq('user_id', authData.user.id).eq('updated_at', current.updated_at).select('id').maybeSingle()
        if (updateError || !updated) throw new Error(`Uppdatering misslyckades för ${wine.name}; posten kan ha ändrats samtidigt.`)
      }
      console.log(`${wine.producer} ${wine.name}: before=[${initialMissing.join(', ')}] completed=[${completed.join(', ')}] after=[${missingFields(current).filter((field) => !completed.includes(field)).join(', ')}]`)
    }
  } finally {
    await supabase.auth.signOut()
  }
}

await main()
