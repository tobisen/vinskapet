import { describe, expect, it } from 'vitest'
import { parseOpenFoodFactsProduct } from '../../supabase/functions/_shared/open-food-facts'

describe('Open Food Facts wine parsing', () => {
  it('maps a product explicitly categorized as wine', () => {
    expect(parseOpenFoodFactsProduct({ product: {
      product_name: 'Example Barolo 2021', brands: 'Example Producer', countries: 'Italy',
      categories_tags: ['en:red-wines'], image_front_url: 'https://img.test/wine.jpg',
    } }, '4006381333931')).toMatchObject({
      source: 'OPEN_FOOD_FACTS', producer: 'Example Producer', vintage: 2021,
      wineType: 'RED', imageUrl: 'https://img.test/wine.jpg',
    })
  })

  it('rejects non-wine products and incomplete records', () => {
    expect(parseOpenFoodFactsProduct({ product: { product_name: 'Beer', categories_tags: ['en:beers'] } }, '1')).toBeNull()
    expect(parseOpenFoodFactsProduct({ product: { categories_tags: ['en:red-wines'] } }, '1')).toBeNull()
  })
})
