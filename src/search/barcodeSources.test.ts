import { describe, expect, it } from 'vitest'
import { parseGtinHubProduct, parseProductGuruProduct } from '../../supabase/functions/_shared/barcode-sources'

describe('free barcode source parsers', () => {
  it('normalizes the GTINHub result for Chateau Plince', () => {
    expect(parseGtinHubProduct({
      found: true,
      product: {
        name: 'Pomerol - Chateau Plince 2018 - 750 Ml',
        image_url: 'https://example.test/plince.jpg',
      },
    }, '3328155009714')).toMatchObject({
      externalId: '3328155009714',
      source: 'GTIN_HUB',
      name: 'Chateau Plince',
      vintage: 2018,
      region: 'Pomerol',
    })
  })

  it('parses ProductGuru product data', () => {
    expect(parseProductGuruProduct({
      name: 'Example Estate 2021',
      brand: 'Example',
      country_of_origin: 'France',
      web_url: 'https://myproduct.guru/p/123',
    }, '12345670')).toMatchObject({
      source: 'PRODUCT_GURU',
      producer: 'Example',
      name: 'Example Estate',
      vintage: 2021,
      country: 'France',
    })
  })

  it('rejects missing products', () => {
    expect(parseProductGuruProduct({ error: 'not found' }, '12345670')).toBeNull()
    expect(parseGtinHubProduct({ found: false }, '12345670')).toBeNull()
  })
})
