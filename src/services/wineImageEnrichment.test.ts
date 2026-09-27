import { describe, expect, it, vi } from 'vitest'
import type { Wine } from '@/types/domain'
import { backfillMissingWineImages, findBestWineImage, scoreWineImageCandidate } from './wineImageEnrichment'

const wine: Wine = {
  id: 'barbaresco', producer: 'Prunotto', name: 'Barbaresco', vintage: 2020,
  country: 'Italien', wineType: 'RED', grapes: [], foodPairings: [], currency: 'SEK',
  status: 'COLLECTION', createdAt: '2026-01-01', updatedAt: '2026-01-01',
}

describe('wine image enrichment', () => {
  it('selects the matching producer instead of another wine with the same appellation', () => {
    const result = findBestWineImage(wine, [
      { source: 'SYSTEMBOLAGET', producer: 'Produttori del Barbaresco', name: 'Barbaresco', wineType: 'RED', imageUrl: 'https://img.test/wrong.png' },
      { source: 'SYSTEMBOLAGET', producer: 'Prunotto', name: 'Barbaresco', wineType: 'RED', imageUrl: 'https://img.test/right.png' },
    ])
    expect(result?.imageUrl).toBe('https://img.test/right.png')
  })

  it('rejects another wine type and ambiguous candidates', () => {
    expect(scoreWineImageCandidate(wine, { source: 'TEST', producer: 'Prunotto', name: 'Barbaresco', wineType: 'WHITE', imageUrl: 'https://img.test/a.png' })).toBe(-1)
    expect(findBestWineImage({ ...wine, producer: '' }, [
      { source: 'TEST', name: 'Barbaresco', imageUrl: 'https://img.test/a.png' },
      { source: 'TEST', name: 'Barbaresco', imageUrl: 'https://img.test/b.png' },
    ])).toBeUndefined()
  })

  it('persists a clear match and skips wines that already have an image', async () => {
    const search = vi.fn(async () => [{ source: 'SYSTEMBOLAGET', producer: 'Prunotto', name: 'Barbaresco', wineType: 'RED' as const, imageUrl: 'https://img.test/right.png', productNumber: '123' }])
    const update = vi.fn(async (_wine: Wine) => true)
    const count = await backfillMissingWineImages([
      wine,
      { ...wine, id: 'done', image: 'https://img.test/existing.png' },
    ], { search, getById: async () => null }, update)
    expect(count).toBe(1)
    expect(search).toHaveBeenCalledOnce()
    expect(update.mock.calls[0]?.[0]).toMatchObject({ image: 'https://img.test/right.png', systembolagetProductNumber: '123' })
  })
})
