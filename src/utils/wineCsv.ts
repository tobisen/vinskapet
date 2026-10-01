import type { Currency, Wine, WineStatus, WineSummary, WineType } from '@/types/domain'

const columns = [
  'wine_id', 'producer', 'name', 'vintage', 'country', 'region', 'appellation', 'wine_type', 'grapes',
  'alcohol_percentage', 'image_url', 'systembolaget_product_number', 'systembolaget_url', 'reference_price',
  'currency', 'storage_potential', 'drinking_window_start', 'drinking_window_end', 'optimal_drinking_start',
  'optimal_drinking_end', 'serving_temperature_min', 'serving_temperature_max', 'food_pairings', 'description',
  'notes', 'status', 'quantity', 'average_purchase_price', 'storage_locations', 'tasting_count', 'created_at', 'updated_at',
] as const

const wineTypes = new Set<WineType>(['RED', 'WHITE', 'ROSE', 'SPARKLING_WHITE', 'SPARKLING_ROSE', 'ORANGE', 'DESSERT', 'FORTIFIED'])
const currencies = new Set<Currency>(['SEK', 'EUR'])
const statuses = new Set<WineStatus>(['COLLECTION', 'WISHLIST', 'WATCHING', 'HISTORY_ONLY'])
const storagePotentials = new Set<NonNullable<Wine['storagePotential']>>(['LOW', 'MEDIUM', 'HIGH'])

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function exportWinesToCsv(wines: readonly WineSummary[]): string {
  const rows = wines.map((wine) => [
    wine.id, wine.producer, wine.name, wine.vintage, wine.country, wine.region, wine.appellation, wine.wineType,
    wine.grapes.join(' | '), wine.alcoholPercentage, wine.image, wine.systembolagetProductNumber, wine.systembolagetUrl,
    wine.referencePrice, wine.currency, wine.storagePotential, wine.drinkingWindowStart, wine.drinkingWindowEnd,
    wine.optimalDrinkingStart, wine.optimalDrinkingEnd, wine.servingTemperatureMin, wine.servingTemperatureMax,
    wine.foodPairings.join(' | '), wine.description, wine.notes, wine.status, wine.quantity, wine.averagePrice,
    wine.storageLocations.join(' | '), wine.tastingCount, wine.createdAt, wine.updatedAt,
  ])
  return `\uFEFF${[columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const input = text.replace(/^\uFEFF/, '')

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (character === '"') quoted = false
      else cell += character
    } else if (character === '"' && cell === '') quoted = true
    else if (character === ',') {
      row.push(cell)
      cell = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[index + 1] === '\n') index += 1
      row.push(cell)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += character
  }
  if (cell || row.length) {
    row.push(cell)
    if (row.some((value) => value.trim())) rows.push(row)
  }
  if (quoted) throw new Error('CSV-filen innehåller ett oavslutat citattecken.')
  return rows
}

export interface WineCsvUpdate {
  wine: Wine
  changedFields: string[]
}

export interface WineCsvPreview {
  rowCount: number
  updates: WineCsvUpdate[]
  unchanged: number
  errors: string[]
}

export function previewWineCsvImport(text: string, existingWines: readonly Wine[]): WineCsvPreview {
  let rows: string[][]
  try {
    rows = parseCsv(text)
  } catch (error) {
    return { rowCount: 0, updates: [], unchanged: 0, errors: [error instanceof Error ? error.message : 'CSV-filen kunde inte läsas.'] }
  }
  if (!rows.length) return { rowCount: 0, updates: [], unchanged: 0, errors: ['CSV-filen är tom.'] }
  const header = rows[0]!.map((value) => value.trim().toLowerCase())
  const idIndex = header.indexOf('wine_id')
  if (idIndex < 0) return { rowCount: rows.length - 1, updates: [], unchanged: 0, errors: ['Kolumnen wine_id saknas.'] }

  const existing = new Map(existingWines.map((wine) => [wine.id, wine]))
  const seen = new Set<string>()
  const errors: string[] = []
  const updates: WineCsvUpdate[] = []
  let unchanged = 0

  rows.slice(1).forEach((values, rowIndex) => {
    const line = rowIndex + 2
    const value = (column: string): string => {
      const index = header.indexOf(column)
      return index < 0 ? '' : (values[index] ?? '').trim()
    }
    const id = values[idIndex]?.trim() ?? ''
    if (!id) {
      errors.push(`Rad ${line}: wine_id saknas.`)
      return
    }
    if (seen.has(id)) {
      errors.push(`Rad ${line}: wine_id ${id} förekommer flera gånger.`)
      return
    }
    seen.add(id)
    const current = existing.get(id)
    if (!current) {
      errors.push(`Rad ${line}: wine_id ${id} finns inte i Vinskåpet.`)
      return
    }

    const wine: Wine = { ...current, grapes: [...current.grapes], foodPairings: [...current.foodPairings] }
    const changedFields: string[] = []
    const setString = (column: string, key: keyof Wine): void => {
      const next = value(column)
      if (next && wine[key] !== next) {
        Object.assign(wine, { [key]: next })
        changedFields.push(column)
      }
    }
    const setNumber = (column: string, key: keyof Wine, integer = false): void => {
      const raw = value(column)
      if (!raw) return
      const next = Number(raw.replace(',', '.'))
      if (!Number.isFinite(next) || (integer && !Number.isInteger(next))) {
        errors.push(`Rad ${line}: ${column} har ett ogiltigt tal.`)
      } else if (wine[key] !== next) {
        Object.assign(wine, { [key]: next })
        changedFields.push(column)
      }
    }
    const setList = (column: string, key: 'grapes' | 'foodPairings'): void => {
      const raw = value(column)
      if (!raw) return
      const next = raw.split('|').map((item) => item.trim()).filter(Boolean)
      if (wine[key].join('|') !== next.join('|')) {
        wine[key] = next
        changedFields.push(column)
      }
    }

    setString('producer', 'producer')
    setString('name', 'name')
    setNumber('vintage', 'vintage', true)
    setString('country', 'country')
    setString('region', 'region')
    setString('appellation', 'appellation')
    setList('grapes', 'grapes')
    setNumber('alcohol_percentage', 'alcoholPercentage')
    setString('image_url', 'image')
    setString('systembolaget_product_number', 'systembolagetProductNumber')
    setString('systembolaget_url', 'systembolagetUrl')
    setNumber('reference_price', 'referencePrice')
    setNumber('drinking_window_start', 'drinkingWindowStart', true)
    setNumber('drinking_window_end', 'drinkingWindowEnd', true)
    setNumber('optimal_drinking_start', 'optimalDrinkingStart', true)
    setNumber('optimal_drinking_end', 'optimalDrinkingEnd', true)
    setNumber('serving_temperature_min', 'servingTemperatureMin')
    setNumber('serving_temperature_max', 'servingTemperatureMax')
    setList('food_pairings', 'foodPairings')
    setString('description', 'description')
    setString('notes', 'notes')

    const wineType = value('wine_type')
    if (wineType && !wineTypes.has(wineType as WineType)) errors.push(`Rad ${line}: wine_type ${wineType} är ogiltig.`)
    else if (wineType && wine.wineType !== wineType) {
      wine.wineType = wineType as WineType
      changedFields.push('wine_type')
    }
    const currency = value('currency')
    if (currency && !currencies.has(currency as Currency)) errors.push(`Rad ${line}: currency ${currency} är ogiltig.`)
    else if (currency && wine.currency !== currency) {
      wine.currency = currency as Currency
      changedFields.push('currency')
    }
    const storagePotential = value('storage_potential')
    if (storagePotential && !storagePotentials.has(storagePotential as NonNullable<Wine['storagePotential']>)) errors.push(`Rad ${line}: storage_potential ${storagePotential} är ogiltig.`)
    else if (storagePotential && wine.storagePotential !== storagePotential) {
      wine.storagePotential = storagePotential as NonNullable<Wine['storagePotential']>
      changedFields.push('storage_potential')
    }
    const status = value('status')
    if (status && !statuses.has(status as WineStatus)) errors.push(`Rad ${line}: status ${status} är ogiltig.`)
    else if (status && wine.status !== status) {
      wine.status = status as WineStatus
      changedFields.push('status')
    }

    if (changedFields.length) updates.push({ wine, changedFields })
    else unchanged += 1
  })

  return { rowCount: rows.length - 1, updates, unchanged, errors }
}
