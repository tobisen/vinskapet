import process from 'node:process'
import { existsSync } from 'node:fs'

const EXPECTED = {
  uniqueWines: 19,
  totalBottles: 27,
  bottlesByType: {
    RED: 11,
    WHITE: 10,
    ROSE: 2,
    SPARKLING_WHITE: 4,
  },
  purchaseCosts: { SEK: 2532, EUR: 28 },
  winesWithPurchasePrice: 13,
  winesWithoutPurchasePrice: 6,
  winesWithReferencePrice: 6,
}

const wine = (data) => ({
  producer: '',
  vintage: null,
  appellation: null,
  grapes: null,
  alcohol_percentage: null,
  image_url: null,
  systembolaget_product_number: null,
  systembolaget_url: null,
  reference_price: null,
  currency: 'SEK',
  optimal_drinking_start: null,
  optimal_drinking_end: null,
  serving_temperature_min: null,
  serving_temperature_max: null,
  food_pairings: null,
  description: null,
  assessment_source: null,
  assessment_updated_at: null,
  status: 'COLLECTION',
  ...data,
})

const collection = [
  wine({ producer: 'Prunotto', name: 'Barbaresco', vintage: 2020, country: 'Italien', region: 'Piemonte, Barbaresco', wine_type: 'RED', quantity: 1, reference_price: 309, purchase_price: null, purchase_currency: 'SEK', storage_potential: 'HIGH', storage_label: 'Mycket bra', drinking_window_start: 2026, drinking_window_end: 2033, window_has_open_end: true }),
  wine({ producer: 'Fontanafredda', name: 'Barolo Serralunga d’Alba', vintage: 2021, country: 'Italien', region: 'Piemonte, Barolo', wine_type: 'RED', quantity: 1, reference_price: 329, purchase_price: null, purchase_currency: 'SEK', storage_potential: 'HIGH', storage_label: 'Mycket bra', drinking_window_start: 2028, drinking_window_end: 2038, window_has_open_end: true }),
  wine({ producer: 'Domaine du Vieux Lazaret', name: 'Châteauneuf-du-Pape', vintage: 2023, country: 'Frankrike', region: 'Rhône', wine_type: 'RED', quantity: 1, purchase_price: 159, purchase_currency: 'SEK', storage_potential: 'HIGH', storage_label: 'Bra', drinking_window_start: 2027, drinking_window_end: 2034 }),
  wine({ producer: 'Luigi Righetti', name: 'Capitel de’ Roari Amarone Classico', vintage: 2022, country: 'Italien', region: 'Veneto, Valpolicella', wine_type: 'RED', quantity: 1, purchase_price: 119, purchase_currency: 'SEK', storage_potential: 'HIGH', storage_label: 'Bra–mycket bra', drinking_window_start: 2027, drinking_window_end: 2035 }),
  wine({ producer: 'Terra Costantino', name: 'DeAetna Rosso', vintage: 2023, country: 'Italien', region: 'Sicilien, Etna', wine_type: 'RED', quantity: 2, purchase_price: 195, purchase_currency: 'SEK', storage_potential: 'HIGH', storage_label: 'Bra', drinking_window_start: 2026, drinking_window_end: 2032 }),
  wine({ name: 'Barbera d’Alba Busije', vintage: 2024, country: 'Italien', region: 'Piemonte', wine_type: 'RED', quantity: 2, purchase_price: 119, purchase_currency: 'SEK', storage_potential: 'MEDIUM', storage_label: 'Kort–medel', drinking_window_start: 2026, drinking_window_end: 2029 }),
  wine({ producer: 'Umani Ronchi', name: 'Montepulciano d’Abruzzo', vintage: 2024, country: 'Italien', region: 'Abruzzo', wine_type: 'RED', quantity: 2, purchase_price: 89, purchase_currency: 'SEK', storage_potential: 'LOW', storage_label: 'Kort', drinking_window_start: 2026, drinking_window_end: 2028 }),
  wine({ producer: 'Paolo Conterno', name: 'Langhe Nebbiolo A Mont', vintage: 2024, country: 'Italien', region: 'Piemonte, Langhe', wine_type: 'RED', quantity: 1, purchase_price: 181, purchase_currency: 'SEK', storage_potential: 'HIGH', storage_label: 'Medel–bra', drinking_window_start: 2027, drinking_window_end: 2032 }),
  wine({ name: 'Crocifere Etna Bianco', vintage: 2024, country: 'Italien', region: 'Sicilien, Etna', wine_type: 'WHITE', quantity: 1, purchase_price: 28, purchase_currency: 'EUR', currency: 'EUR', storage_potential: 'HIGH', storage_label: 'Bra', drinking_window_start: 2026, drinking_window_end: 2030 }),
  wine({ producer: 'Giovanni Rosso', name: 'Etna Bianco', vintage: 2025, country: 'Italien', region: 'Sicilien, Etna', wine_type: 'WHITE', quantity: 2, purchase_price: 179, purchase_currency: 'SEK', storage_potential: 'HIGH', storage_label: 'Medel–bra', drinking_window_start: 2026, drinking_window_end: 2031 }),
  wine({ producer: 'Susana Balbo', name: 'Signature Barrel Fermented Torrontés', vintage: 2025, country: 'Argentina', region: 'Mendoza, Uco Valley', wine_type: 'WHITE', quantity: 2, reference_price: 189, purchase_price: null, purchase_currency: 'SEK', storage_potential: 'MEDIUM', storage_label: 'Medel', drinking_window_start: 2026, drinking_window_end: 2029 }),
  wine({ producer: 'Gustav', name: 'Riesling Trocken', vintage: 2025, country: 'Tyskland', region: 'Rheinhessen', wine_type: 'WHITE', quantity: 2, purchase_price: 79, purchase_currency: 'SEK', storage_potential: 'LOW', storage_label: 'Kort', drinking_window_start: 2026, drinking_window_end: 2028 }),
  wine({ producer: 'havn', name: 'Riesling', vintage: 2025, country: 'Tyskland', region: 'Rheinhessen', wine_type: 'WHITE', quantity: 2, purchase_price: 119, purchase_currency: 'SEK', storage_potential: 'MEDIUM', storage_label: 'Kort–medel', drinking_window_start: 2026, drinking_window_end: 2029 }),
  wine({ producer: 'Domaine Roux', name: 'Bourgogne Les Murelles', vintage: 2024, country: 'Frankrike', region: 'Bourgogne', wine_type: 'WHITE', grapes: ['Chardonnay'], quantity: 1, purchase_price: 199, purchase_currency: 'SEK', storage_potential: 'MEDIUM', storage_label: 'Medel', drinking_window_start: 2026, drinking_window_end: 2031 }),
  wine({ name: 'Whispering Angel', vintage: 2025, country: 'Frankrike', region: 'Provence', wine_type: 'ROSE', quantity: 2, reference_price: 219, purchase_price: null, purchase_currency: 'SEK', storage_potential: 'LOW', storage_label: 'Kort', drinking_window_start: 2026, drinking_window_end: 2028 }),
  wine({ producer: 'Pierre Olivier', name: 'Blanc de Blancs Organic Brut', country: 'Frankrike', region: 'Frankrike', wine_type: 'SPARKLING_WHITE', quantity: 1, reference_price: 85, purchase_price: null, purchase_currency: 'SEK', storage_potential: 'LOW', storage_label: 'Kort', drinking_window_start: 2026, drinking_window_end: 2027 }),
  wine({ name: 'Cuvée Céleste Blanc de Blancs Brut', country: 'Frankrike', region: 'Loire', wine_type: 'SPARKLING_WHITE', quantity: 1, reference_price: 119, purchase_price: null, purchase_currency: 'SEK', storage_potential: 'LOW', storage_label: 'Kort', drinking_window_start: 2026, drinking_window_end: 2028 }),
  wine({ producer: 'Haut-Mouleyre', name: 'Crémant de Bordeaux', country: 'Frankrike', region: 'Bordeaux', wine_type: 'SPARKLING_WHITE', quantity: 1, purchase_price: 115, purchase_currency: 'SEK', storage_potential: 'LOW', storage_label: 'Kort', drinking_window_start: 2026, drinking_window_end: 2028 }),
  wine({ producer: 'Langlois', name: 'Crémant de Loire Brut Réserve', country: 'Frankrike', region: 'Loire', wine_type: 'SPARKLING_WHITE', quantity: 1, purchase_price: 199, purchase_currency: 'SEK', storage_potential: 'MEDIUM', storage_label: 'Kort–medel', drinking_window_start: 2026, drinking_window_end: 2029 }),
]

function summarize(rows) {
  const bottlesByType = {}
  const purchaseCosts = {}

  for (const row of rows) {
    bottlesByType[row.wine_type] = (bottlesByType[row.wine_type] ?? 0) + row.quantity
    if (row.purchase_price !== null) {
      purchaseCosts[row.purchase_currency] = (purchaseCosts[row.purchase_currency] ?? 0) + row.purchase_price * row.quantity
    }
  }

  return {
    uniqueWines: rows.length,
    inventoryRows: rows.length,
    totalBottles: rows.reduce((sum, row) => sum + row.quantity, 0),
    bottlesByType,
    purchaseCosts,
    winesWithPurchasePrice: rows.filter((row) => row.purchase_price !== null).length,
    winesWithoutPurchasePrice: rows.filter((row) => row.purchase_price === null).length,
    winesWithReferencePrice: rows.filter((row) => row.reference_price !== null).length,
  }
}

function validate(rows, summary) {
  const errors = []
  const duplicateKeys = rows
    .map((row) => `${row.producer}|${row.name}|${row.vintage ?? 'NV'}`)
    .filter((key, index, keys) => keys.indexOf(key) !== index)

  if (duplicateKeys.length) errors.push(`Duplicerade viner: ${[...new Set(duplicateKeys)].join(', ')}`)
  if (summary.uniqueWines !== EXPECTED.uniqueWines) errors.push(`Förväntade ${EXPECTED.uniqueWines} unika viner, fick ${summary.uniqueWines}.`)
  if (summary.inventoryRows !== EXPECTED.uniqueWines) errors.push(`Förväntade ${EXPECTED.uniqueWines} inventory-poster, fick ${summary.inventoryRows}.`)
  if (summary.totalBottles !== EXPECTED.totalBottles) errors.push(`Förväntade ${EXPECTED.totalBottles} flaskor, fick ${summary.totalBottles}.`)

  for (const [type, expected] of Object.entries(EXPECTED.bottlesByType)) {
    if (summary.bottlesByType[type] !== expected) errors.push(`Förväntade ${expected} ${type}-flaskor, fick ${summary.bottlesByType[type] ?? 0}.`)
  }
  for (const type of Object.keys(summary.bottlesByType)) {
    if (!(type in EXPECTED.bottlesByType)) errors.push(`Otillåten vintyp i datasetet: ${type}.`)
  }
  for (const [currency, expected] of Object.entries(EXPECTED.purchaseCosts)) {
    if (summary.purchaseCosts[currency] !== expected) errors.push(`Förväntad inköpskostnad ${expected} ${currency}, fick ${summary.purchaseCosts[currency] ?? 0} ${currency}.`)
  }
  for (const field of ['winesWithPurchasePrice', 'winesWithoutPurchasePrice', 'winesWithReferencePrice']) {
    if (summary[field] !== EXPECTED[field]) errors.push(`${field}: förväntade ${EXPECTED[field]}, fick ${summary[field]}.`)
  }
  for (const row of rows) {
    if (row.status !== 'COLLECTION') errors.push(`${row.name} har status ${row.status}.`)
    if (!Number.isInteger(row.quantity) || row.quantity < 1) errors.push(`${row.name} har ogiltigt antal.`)
    if (row.purchase_price === null && row.purchase_currency !== 'SEK') errors.push(`${row.name} har valuta utan inköpspris.`)
  }

  return errors
}

function printDryRun(summary, errors) {
  console.log('Vinskåpet – dry-run för riktig samling')
  console.log('----------------------------------------')
  console.log(`Unique wines: ${summary.uniqueWines}`)
  console.log(`Inventory rows: ${summary.inventoryRows}`)
  console.log(`Total bottles: ${summary.totalBottles}`)
  for (const type of Object.keys(EXPECTED.bottlesByType)) console.log(`${type}: ${summary.bottlesByType[type] ?? 0}`)
  console.log(`Known purchase cost SEK: ${summary.purchaseCosts.SEK ?? 0}`)
  console.log(`Known purchase cost EUR: ${summary.purchaseCosts.EUR ?? 0}`)
  console.log(`Wines with purchase price: ${summary.winesWithPurchasePrice}`)
  console.log(`Wines without purchase price: ${summary.winesWithoutPurchasePrice}`)
  console.log(`Wines with reference price: ${summary.winesWithReferencePrice}`)
  console.log(`Validation errors: ${errors.length}`)
  for (const error of errors) console.error(`- ${error}`)
}

function toWineInsert(row, userId, id, timestamp) {
  const { quantity, purchase_price, purchase_currency, storage_label, window_has_open_end, ...wineFields } = row
  const notes = [
    `Lagringspotential enligt källdata: ${storage_label}.`,
    window_has_open_end ? `Drickfönstrets slutår angavs som ${row.drinking_window_end}+.` : null,
  ].filter(Boolean).join(' ')

  return { ...wineFields, id, user_id: userId, notes, created_at: timestamp, updated_at: timestamp }
}

function toInventoryInsert(row, userId, wineId, timestamp) {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    wine_id: wineId,
    quantity: row.quantity,
    purchase_price: row.purchase_price,
    currency: row.purchase_currency,
    purchase_date: null,
    purchase_location: null,
    storage_location: 'WINE_FRIDGE',
    notes: null,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function wineKey(row) {
  return `${row.producer}|${row.name}|${row.vintage ?? 'NV'}`
}

async function verifyImport(supabase, userId) {
  const [{ data: wines, error: winesError }, { data: inventory, error: inventoryError }, { data: tastings, error: tastingsError }] = await Promise.all([
    supabase.from('wines').select('*').eq('user_id', userId),
    supabase.from('inventory').select('*').eq('user_id', userId),
    supabase.from('tastings').select('id').eq('user_id', userId),
  ])
  if (winesError) throw new Error(`Verifiering av wines misslyckades: ${winesError.message}`)
  if (inventoryError) throw new Error(`Verifiering av inventory misslyckades: ${inventoryError.message}`)
  if (tastingsError) throw new Error(`Verifiering av tastings misslyckades: ${tastingsError.message}`)

  const wineById = new Map(wines.map((row) => [row.id, row]))
  const bottlesByType = {}
  const purchaseCosts = {}
  for (const row of inventory) {
    const importedWine = wineById.get(row.wine_id)
    if (!importedWine) throw new Error(`Inventory ${row.id} pekar på ett vin som saknas.`)
    bottlesByType[importedWine.wine_type] = (bottlesByType[importedWine.wine_type] ?? 0) + row.quantity
    if (row.purchase_price !== null) {
      purchaseCosts[row.currency] = (purchaseCosts[row.currency] ?? 0) + row.purchase_price * row.quantity
    }
  }

  const expectedKeys = new Set(collection.map(wineKey))
  const actualKeys = new Set(wines.map(wineKey))
  const missingWines = [...expectedKeys].filter((key) => !actualKeys.has(key))
  const unexpectedWines = [...actualKeys].filter((key) => !expectedKeys.has(key))
  const result = {
    uniqueWines: wines.length,
    inventoryRows: inventory.length,
    totalBottles: inventory.reduce((sum, row) => sum + row.quantity, 0),
    bottlesByType,
    purchaseCosts,
    winesWithPurchasePrice: inventory.filter((row) => row.purchase_price !== null).length,
    winesWithoutPurchasePrice: inventory.filter((row) => row.purchase_price === null).length,
    winesWithReferencePrice: wines.filter((row) => row.reference_price !== null).length,
    tastings: tastings.length,
    missingWines,
    unexpectedWines,
  }
  const errors = validate(collection, result)
  if (missingWines.length) errors.push(`Viner saknas: ${missingWines.join(', ')}`)
  if (unexpectedWines.length) errors.push(`Oväntade/demo-viner finns kvar: ${unexpectedWines.join(', ')}`)
  if (result.tastings !== 0) errors.push(`Förväntade 0 tasting-poster, fick ${result.tastings}.`)

  console.log('\nVerifiering av databasen')
  console.log('-------------------------')
  printDryRun(result, errors)
  console.log(`Tastings: ${result.tastings}`)
  console.log(`Alla 19 riktiga viner finns: ${missingWines.length === 0 ? 'ja' : 'nej'}`)
  console.log(`Demo/test-viner finns kvar: ${unexpectedWines.length === 0 ? 'nej' : 'ja'}`)
  if (errors.length) throw new Error('Databasverifieringen underkändes.')
}

async function applyImport() {
  if (process.env.CONFIRM_COLLECTION_RESET !== 'DELETE_AND_IMPORT_19_WINES') {
    throw new Error('Importen kräver CONFIRM_COLLECTION_RESET=DELETE_AND_IMPORT_19_WINES.')
  }

  if (existsSync('.env.local')) process.loadEnvFile('.env.local')

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const email = process.env.IMPORT_USER_EMAIL
  const password = process.env.IMPORT_USER_PASSWORD
  if (!url || !key || !email || !password) throw new Error('Supabase-konfiguration eller tillfälliga importuppgifter saknas.')

  const { createClient } = await import('@supabase/supabase-js')
  const { default: WebSocket } = await import('ws')
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket },
  })
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError || !authData.user) throw new Error(`Kunde inte autentisera användaren: ${authError?.message ?? 'okänt fel'}`)

  const userId = authData.user.id
  const timestamp = new Date().toISOString()
  const wineRows = collection.map((row) => toWineInsert(row, userId, crypto.randomUUID(), timestamp))
  const inventoryRows = collection.map((row, index) => toInventoryInsert(row, userId, wineRows[index].id, timestamp))

  // Supabase-klienten kan inte göra hela operationen atomiskt utan en databasfunktion.
  for (const table of ['tastings', 'inventory', 'wines']) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId)
    if (error) throw new Error(`Radering från ${table} misslyckades: ${error.message}`)
  }
  const { error: wineError } = await supabase.from('wines').insert(wineRows)
  if (wineError) throw new Error(`Import av wines misslyckades: ${wineError.message}`)
  const { error: inventoryError } = await supabase.from('inventory').insert(inventoryRows)
  if (inventoryError) throw new Error(`Import av inventory misslyckades: ${inventoryError.message}`)

  console.log(`Import klar för autentiserad användare ${userId}: ${wineRows.length} viner, ${inventoryRows.length} inventory-poster.`)
  await verifyImport(supabase, userId)
  await supabase.auth.signOut()
}

const summary = summarize(collection)
const errors = validate(collection, summary)
printDryRun(summary, errors)

if (errors.length) {
  console.error('\nSTOPP: datasetet underkändes. Ingen databasanslutning eller ändring har gjorts.')
  process.exitCode = 1
} else if (process.argv.includes('--apply')) {
  await applyImport()
} else {
  console.log('\nDry-run godkänd. Ingen databasanslutning eller ändring har gjorts.')
}
