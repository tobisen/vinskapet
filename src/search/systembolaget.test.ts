import { describe, expect, it, vi } from 'vitest'
import { findCandidateUrls, findWineCandidatePaths, knownProductNumberFor, parseProductHtml, parseServingTemperature } from '../../supabase/functions/_shared/systembolaget'
import { SystembolagetWineSearchProvider, normalizeProductNumber } from './SystembolagetWineSearchProvider'
import { wineFromSearchResult } from './wineFromSearchResult'

const product = {
  productId: '56829319', productNumber: '9601201', productNumberShort: '96012',
  productNameBold: 'Barolo di Serralunga', productNameThin: 'Luigi Pira', producerName: 'Luigi Pira',
  categoryLevel1: 'Vin', categoryLevel2: 'Rött vin', customCategoryTitle: 'Rött vin, Stramt & Nyanserat',
  vintage: '2021', grapes: '100% Nebbiolo.', country: 'Italien', originLevel1: 'Piemonte', originLevel2: 'Barolo',
  priceInclVat: 416, alcoholPercentage: 14.5, usage: 'Serveras vid 16–18°C till mörkt kött.',
  tasteSymbolsList: ['Lamm', 'Nöt', 'Vilt'], taste: 'Komplex och nyanserad smak.',
  images: [{ imageUrl: 'https://product-cdn.systembolaget.se/productimages/56829319/56829319' }],
}

const html = (value: Record<string, unknown> = product): string => `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
  props: { pageProps: { fallback: { '@"api","ecommerce","product","9601201",': value } } },
})}</script></html>`

describe('Systembolaget page parsing', () => {
  it('finds exact and short article numbers before text candidates', () => {
    const sitemap = [
      'https://www.systembolaget.se/produkt/vin/other-wine-1234501/',
      'https://www.systembolaget.se/produkt/vin/barolo-di-serralunga-9601201/',
      'https://www.systembolaget.se/produkt/vin/barolo-serralunga-alt-9601301/',
    ].map((url) => `<loc>${url}</loc>`).join('')

    expect(findCandidateUrls(sitemap, '96 012')).toEqual(['https://www.systembolaget.se/produkt/vin/barolo-di-serralunga-9601201/'])
    expect(findCandidateUrls(sitemap, 'Barolo Serralunga')).toHaveLength(2)
  })

  it('combines name and producer candidates for image backfill', () => {
    const paths = [
      '/produkt/vin/capitel-de-roari-1236601/',
      '/produkt/vin/1909-righetti-7630801/',
      '/produkt/vin/amarone-classico-7654301/',
    ]
    expect(findWineCandidatePaths(paths, {
      name: 'Capitel de’ Roari Amarone Classico',
      producer: 'Luigi Righetti',
    })).toEqual(expect.arrayContaining([
      'https://www.systembolaget.se/produkt/vin/capitel-de-roari-1236601/',
      'https://www.systembolaget.se/produkt/vin/1909-righetti-7630801/',
    ]))
  })

  it('maps product metadata, image and price without inventing values', () => {
    const result = parseProductHtml(html(), 'https://www.systembolaget.se/produkt/vin/barolo-di-serralunga-9601201/')
    expect(result).toMatchObject({
      source: 'SYSTEMBOLAGET', producer: 'Luigi Pira', name: 'Barolo di Serralunga', vintage: 2021,
      country: 'Italien', region: 'Piemonte', appellation: 'Barolo', wineType: 'RED', grapes: ['Nebbiolo'],
      alcoholPercentage: 14.5, referencePrice: 416, currency: 'SEK', servingTemperatureMin: 16,
      servingTemperatureMax: 18, foodPairings: ['Lamm', 'Nöt', 'Vilt'],
      imageUrl: 'https://product-cdn.systembolaget.se/productimages/56829319/56829319_400.png',
    })
  })

  it('combines split product titles without repeating the producer', () => {
    const result = parseProductHtml(html({
      ...product,
      productNameBold: 'Susana Balbo',
      productNameThin: 'Signature Barrel Fermented Torrontés',
      producerName: 'Susana Balbo Wines',
    }), 'https://www.systembolaget.se/produkt/vin/susana-balbo-9296801/')
    expect(result?.name).toBe('Susana Balbo Signature Barrel Fermented Torrontés')

    expect(parseProductHtml(html(), 'https://example.test/product')?.name).toBe('Barolo di Serralunga')
  })

  it('keeps individual name-token candidates ahead of loose producer-token candidates', () => {
    const paths = [
      '/produkt/vin/etna-bianco-7193301/',
      '/produkt/vin/etna-bianco-9592301/',
      '/produkt/vin/etna-bianco-9599701/',
      '/produkt/vin/deaetna-bianco-9257401/',
      '/produkt/vin/idda-etna-bianco-7070201/',
      '/produkt/vin/vulka-etna-bianco-5170101/',
      '/produkt/vin/etna-9209501/',
      '/produkt/vin/san-giovanni-5409501/',
      '/produkt/vin/e-rosso-7203101/',
    ]
    expect(findWineCandidatePaths(paths, { name: 'Etna Bianco', producer: 'Giovanni Rosso' }))
      .toContain('https://www.systembolaget.se/produkt/vin/etna-9209501/')
  })

  it('uses verified product numbers when the sitemap title omits part of the wine name', () => {
    expect(knownProductNumberFor('Barbera d’Alba Busije')).toBe('7572201')
    expect(knownProductNumberFor('Langhe Nebbiolo A Mont')).toBe('9262601')
    expect(knownProductNumberFor('Unknown wine')).toBeUndefined()
    expect(findWineCandidatePaths([
      '/produkt/vin/barbera-d-alba-2307101/',
      '/produkt/vin/barbera-d-alba-7572201/',
    ], { name: 'Barbera d’Alba Busije' })[0]).toBe(
      'https://www.systembolaget.se/produkt/vin/barbera-d-alba-7572201/',
    )
  })

  it('keeps missing vintage and image undefined', () => {
    const result = parseProductHtml(html({ ...product, vintage: null, images: [] }), 'https://example.test/product')
    expect(result?.vintage).toBeUndefined()
    expect(result?.imageUrl).toBeUndefined()
  })

  it('parses a single serving temperature', () => {
    expect(parseServingTemperature('Serveras vid cirka 18°C.')).toEqual({ min: 18, max: 18 })
  })
})

describe('Systembolaget provider', () => {
  it('normalizes and performs an exact product lookup', async () => {
    const invoke = vi.fn(async () => ({ data: { results: [{ source: 'SYSTEMBOLAGET', name: 'Barolo', productNumber: '9601201' }] }, error: null }))
    const provider = new SystembolagetWineSearchProvider(invoke)
    expect(normalizeProductNumber('96 012-01')).toBe('9601201')
    expect((await provider.getById('96 012'))?.name).toBe('Barolo')
    expect(invoke).toHaveBeenCalledWith('systembolaget-search', { body: { query: '96012' } })
  })

  it('reports provider errors and leaves barcode lookup unsupported', async () => {
    const onError = vi.fn()
    const provider = new SystembolagetWineSearchProvider(async () => ({ data: null, error: new Error('offline') }), onError)
    await expect(provider.search('Barolo')).rejects.toThrow('Systembolaget search failed')
    expect(onError).toHaveBeenCalledOnce()
    expect(await provider.lookupBarcode('7350000000000')).toEqual([])
  })

  it('sends structured wine hints for image enrichment', async () => {
    const invoke = vi.fn(async () => ({ data: { results: [] }, error: null }))
    const provider = new SystembolagetWineSearchProvider(invoke)
    await provider.searchWine({ name: 'Barbaresco', producer: 'Prunotto', systembolagetProductNumber: '50814' })
    expect(invoke).toHaveBeenCalledWith('systembolaget-search', {
      body: { wine: { name: 'Barbaresco', producer: 'Prunotto', productNumber: '50814' } },
    })
  })
})

describe('external purchase mapping', () => {
  it('stores Systembolaget price as reference price only', () => {
    const wine = wineFromSearchResult({
      source: 'SYSTEMBOLAGET', producer: 'Luigi Pira', name: 'Barolo', wineType: 'RED',
      referencePrice: 416, storagePotential: 'HIGH', drinkingWindowStart: 2028,
      drinkingWindowEnd: 2040, optimalDrinkingStart: 2030, optimalDrinkingEnd: 2038,
    })
    expect(wine.referencePrice).toBe(416)
    expect(wine.optimalDrinkingStart).toBe(2030)
    expect(wine.storagePotential).toBe('HIGH')
    expect(wine).not.toHaveProperty('purchasePrice')
  })

  it('treats barcode vintage as user-confirmed rather than guaranteed', () => {
    const result = { source: 'SYSTEMBOLAGET', producer: 'Luigi Pira', name: 'Barolo', wineType: 'RED' as const, vintage: 2024 }
    expect(wineFromSearchResult(result, 2023).vintage).toBe(2023)
    expect(wineFromSearchResult(result, null).vintage).toBeUndefined()
  })

  it('can map a search result directly to a wishlist wine', () => {
    const result = { source: 'SYSTEMBOLAGET', producer: 'Luigi Pira', name: 'Barolo', wineType: 'RED' as const }
    expect(wineFromSearchResult(result, 2023, 'RED', 'WISHLIST').status).toBe('WISHLIST')
  })
})
