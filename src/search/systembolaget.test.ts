import { describe, expect, it, vi } from 'vitest'
import { findCandidateUrls, parseProductHtml, parseServingTemperature } from '../../supabase/functions/_shared/systembolaget'
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
})
