import { existsSync } from 'node:fs'
import process from 'node:process'
import { LocalWineEnrichmentProvider } from '../src/domain/enrichment/LocalWineEnrichmentProvider.ts'

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

function targetSummary(wines) {
  return {
    wines: wines.length,
    missingGrapes: wines.filter((wine) => isMissing(wine.grapes)).length,
    missingOptimalPeriod: wines.filter((wine) => isMissing(wine.optimal_drinking_start) || isMissing(wine.optimal_drinking_end)).length,
    missingServing: wines.filter((wine) => isMissing(wine.serving_temperature_min) || isMissing(wine.serving_temperature_max)).length,
    missingFoodPairing: wines.filter((wine) => isMissing(wine.food_pairings)).length,
  }
}

function printTargetSummary(label, wines) {
  const summary = targetSummary(wines)
  console.log(`${label}: wines=${summary.wines} missing_grapes=${summary.missingGrapes} missing_optimal_period=${summary.missingOptimalPeriod} missing_serving=${summary.missingServing} missing_food_pairing=${summary.missingFoodPairing}`)
}

function validEnrichment(enrichment) {
  if (!enrichment || typeof enrichment !== 'object' || Array.isArray(enrichment)) return false
  if (!Object.keys(enrichment).every((field) => field in fields || ['confidence', 'reasoningSummary', 'ruleIds'].includes(field))) return false
  for (const [field, value] of Object.entries(enrichment)) {
    if (value == null) continue
    if (['grapes', 'foodPairings'].includes(field) && !isStringList(value)) return false
    if (field === 'storagePotential' && !['LOW', 'MEDIUM', 'HIGH'].includes(value)) return false
    if (['drinkingWindowStart', 'drinkingWindowEnd', 'optimalDrinkingStart', 'optimalDrinkingEnd'].includes(field) && (!Number.isInteger(value) || value < 1900 || value > 2200)) return false
    if (['servingTemperatureMin', 'servingTemperatureMax'].includes(field) && (typeof value !== 'number' || value < 0 || value > 30)) return false
    if (field === 'description' && (typeof value !== 'string' || !value.trim() || value.length > 600)) return false
    if (field === 'confidence' && (typeof value !== 'number' || value < 0 || value > 1)) return false
    if (field === 'reasoningSummary' && (typeof value !== 'string' || !value.trim() || value.length > 500)) return false
    if (field === 'ruleIds' && (!isStringList(value) || value.some((ruleId) => !/^[A-Z0-9_]+$/.test(ruleId)))) return false
  }
  if (enrichment.drinkingWindowStart && enrichment.drinkingWindowEnd && enrichment.drinkingWindowStart > enrichment.drinkingWindowEnd) return false
  if (enrichment.optimalDrinkingStart && enrichment.optimalDrinkingEnd && enrichment.optimalDrinkingStart > enrichment.optimalDrinkingEnd) return false
  if (enrichment.drinkingWindowStart && enrichment.optimalDrinkingStart && enrichment.drinkingWindowStart > enrichment.optimalDrinkingStart) return false
  if (enrichment.optimalDrinkingEnd && enrichment.drinkingWindowEnd && enrichment.optimalDrinkingEnd > enrichment.drinkingWindowEnd) return false
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
    imageUrl: wine.image_url ?? undefined,
    productNumber: wine.systembolaget_product_number ?? undefined,
    productUrl: wine.systembolaget_url ?? undefined,
    referencePrice: wine.reference_price ?? undefined,
    currency: wine.currency,
    storagePotential: wine.storage_potential ?? undefined,
    drinkingWindowStart: wine.drinking_window_start ?? undefined,
    drinkingWindowEnd: wine.drinking_window_end ?? undefined,
    optimalDrinkingStart: wine.optimal_drinking_start ?? undefined,
    optimalDrinkingEnd: wine.optimal_drinking_end ?? undefined,
    servingTemperatureMin: wine.serving_temperature_min ?? undefined,
    servingTemperatureMax: wine.serving_temperature_max ?? undefined,
    foodPairings: wine.food_pairings ?? [],
    description: wine.description ?? undefined,
  }
}

function validatedPatch(wine, enrichment) {
  if (!validEnrichment(enrichment)) {
    throw new Error('Edge Function returnerade enrichment i fel format.')
  }
  const before = missingFields(wine)
  const patch = {}
  if (enrichment.confidence != null && enrichment.confidence < 0.65) return { before, patch, lowConfidence: true }
  for (const field of before) {
    const value = enrichment[field]
    if (!isMissing(value)) patch[fields[field]] = value
  }
  const value = (field) => patch[fields[field]] ?? wine[fields[field]]
  if (value('drinkingWindowStart') && value('optimalDrinkingStart') && value('drinkingWindowStart') > value('optimalDrinkingStart')) throw new Error('Enrichment skapar ett ogiltigt startintervall.')
  if (value('optimalDrinkingEnd') && value('drinkingWindowEnd') && value('optimalDrinkingEnd') > value('drinkingWindowEnd')) throw new Error('Enrichment skapar ett ogiltigt slutintervall.')
  return { before, patch, lowConfidence: false }
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
  const localProvider = new LocalWineEnrichmentProvider()
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError || !authData.user) throw new Error(`Kunde inte autentisera användaren: ${authError?.message ?? 'okänt fel'}`)

  try {
    const { data: wines, error } = await supabase.from('wines').select('*').eq('user_id', authData.user.id).order('created_at')
    if (error) throw new Error(`Kunde inte läsa wines: ${error.message}`)

    console.log(`Wine metadata audit: ${wines.length} wines`)
    printTargetSummary('Before', wines)
    for (const wine of wines) console.log(`- ${wine.producer} ${wine.name} ${wine.vintage ?? 'NV'}: ${missingFields(wine).join(', ') || 'complete'}`)
    const incomplete = wines.filter((wine) => missingFields(wine).length)
    console.log(`Incomplete wines: ${incomplete.length}`)
    const missingCounts = Object.keys(fields).map((field) => [field, incomplete.filter((wine) => missingFields(wine).includes(field)).length]).filter(([, count]) => count)
    console.log(`Missing fields: ${missingCounts.map(([field, count]) => `${field}=${count}`).join(', ') || 'none'}`)

    if (!process.argv.includes('--apply')) {
      console.log('Audit klar. Regelmotorn har inte körts och ingen data har ändrats.')
      return
    }
    if (process.env.CONFIRM_METADATA_ENRICHMENT !== 'ENRICH_MISSING_WINE_METADATA') {
      throw new Error('Enrichment kräver CONFIRM_METADATA_ENRICHMENT=ENRICH_MISSING_WINE_METADATA.')
    }

    let succeeded = 0
    let failed = 0
    for (const wine of incomplete) {
      const initialMissing = missingFields(wine)
      try {
        const enrichment = await localProvider.enrich(candidate(wine))
        const { data: current, error: reloadError } = await supabase.from('wines').select('*').eq('id', wine.id).eq('user_id', authData.user.id).single()
        if (reloadError) throw new Error(`Kunde inte läsa om posten: ${reloadError.message}`)
        const { patch, lowConfidence } = validatedPatch(current, enrichment)
        if (lowConfidence) throw new Error(`För låg confidence (${enrichment.confidence})`)
        const completed = Object.keys(patch).map((column) => Object.entries(fields).find(([, value]) => value === column)?.[0])
        if (completed.length) {
          const timestamp = new Date().toISOString()
          const { data: updated, error: updateError } = await supabase.from('wines').update({
            ...patch,
            assessment_source: current.assessment_source ?? 'Local rules',
            assessment_updated_at: timestamp,
            updated_at: timestamp,
          }).eq('id', wine.id).eq('user_id', authData.user.id).eq('updated_at', current.updated_at).select('id').maybeSingle()
          if (updateError || !updated) throw new Error('Posten kan ha ändrats samtidigt.')
        }
        succeeded += 1
        console.log(`OK ${wine.producer} ${wine.name}: before=[${initialMissing.join(', ')}] completed=[${completed.join(', ')}] after=[${missingFields(current).filter((field) => !completed.includes(field)).join(', ')}]`)
      } catch (error) {
        failed += 1
        console.error(`FAILED ${wine.producer} ${wine.name}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    console.log(`Enrichment result: total=${incomplete.length} succeeded=${succeeded} failed=${failed}`)
    const { data: finalWines, error: finalError } = await supabase.from('wines').select('*').eq('user_id', authData.user.id).order('created_at')
    if (finalError) throw new Error(`Kunde inte verifiera enrichment: ${finalError.message}`)
    printTargetSummary('After', finalWines)
    if (failed) process.exitCode = 1
  } finally {
    await supabase.auth.signOut()
  }
}

await main()
