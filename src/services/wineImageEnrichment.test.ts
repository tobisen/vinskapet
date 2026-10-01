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

  it('rejects a different producer that only shares a first name', () => {
    expect(scoreWineImageCandidate(
      { ...wine, producer: 'Paolo Conterno', name: 'Langhe Nebbiolo A Mont' },
      { source: 'SYSTEMBOLAGET', producer: 'Paolo Scavino', name: 'Paolo Scavino Langhe Nebbiolo', wineType: 'RED', imageUrl: 'https://img.test/wrong.png' },
    )).toBe(-1)
  })

  it('accepts a brand stored in the product name instead of the producer field', () => {
    expect(scoreWineImageCandidate(
      { ...wine, producer: 'havn', name: 'Riesling', wineType: 'WHITE' },
      { source: 'SYSTEMBOLAGET', producer: 'Weingut Frey', name: 'havn Riesling', wineType: 'WHITE', imageUrl: 'https://img.test/havn.png' },
    )).toBeGreaterThanOrEqual(7)
  })

  it('accepts duplicate package variants and prefers the standard bottle', () => {
    const result = findBestWineImage(wine, [
      { source: 'SYSTEMBOLAGET', producer: 'Prunotto', name: 'Barbaresco', wineType: 'RED', imageUrl: 'https://img.test/large.png', productNumber: '1236602' },
      { source: 'SYSTEMBOLAGET', producer: 'Prunotto', name: 'Barbaresco', wineType: 'RED', imageUrl: 'https://img.test/standard.png', productNumber: '1236601' },
    ])
    expect(result?.imageUrl).toBe('https://img.test/standard.png')
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

  it('uses structured wine hints when the provider supports them', async () => {
    const search = vi.fn(async () => [])
    const searchWine = vi.fn(async () => [{
      source: 'SYSTEMBOLAGET', producer: 'Luigi Righetti', name: 'Capitel de Roari',
      wineType: 'RED' as const, imageUrl: 'https://img.test/roari.png', productNumber: '1236601',
    }])
    const update = vi.fn(async (_wine: Wine) => true)
    const capitel = { ...wine, producer: 'Luigi Righetti', name: 'Capitel de’ Roari Amarone Classico' }

    expect(await backfillMissingWineImages([capitel], { search, searchWine, getById: async () => null }, update)).toBe(1)
    expect(searchWine).toHaveBeenCalledWith(capitel)
    expect(search).not.toHaveBeenCalled()
  })
})
