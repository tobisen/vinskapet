import { describe, expect, it } from 'vitest'
import { normalizeWineImageUrl } from './wineImage'

describe('wine image URLs', () => {
  it('uses the full-bottle Systembolaget image variant for legacy URLs', () => {
    expect(normalizeWineImageUrl(
      'https://product-cdn.systembolaget.se/productimages/56829319/56829319',
    )).toBe('https://product-cdn.systembolaget.se/productimages/56829319/56829319_400.png')
    expect(normalizeWineImageUrl(
      'https://product-cdn.systembolaget.se/productimages/56829319/56829319_200.png?crop=1',
    )).toBe('https://product-cdn.systembolaget.se/productimages/56829319/56829319_400.png')
    expect(normalizeWineImageUrl(
      'https://product-cdn.systembolaget.se/productimages/56829319/56829319_200.png_400.png',
    )).toBe('https://product-cdn.systembolaget.se/productimages/56829319/56829319_400.png')
  })

  it('leaves other valid image providers unchanged', () => {
    expect(normalizeWineImageUrl('https://images.example.test/wine.jpg?size=large'))
      .toBe('https://images.example.test/wine.jpg?size=large')
  })

  it('rejects unsupported image values', () => {
    expect(normalizeWineImageUrl('data:image/png;base64,abc')).toBeUndefined()
    expect(normalizeWineImageUrl('not a URL')).toBeUndefined()
  })
})
