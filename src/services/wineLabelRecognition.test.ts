import { describe, expect, it, vi } from 'vitest'
import type { WineSearchProvider } from '@/types/search'
import { buildLabelSearchQueries, extractLabelSearchQueries, scoreLabelResult, searchRecognizedLabel } from './wineLabelRecognition'

const label = `PRUNOTTO\nBARBARESCO\n2020\n14% VOL\n750 ml`

describe('wine label recognition', () => {
  it('extracts useful label lines and ignores measurements', () => {
    expect(extractLabelSearchQueries(label)).toEqual(['PRUNOTTO', 'BARBARESCO'])
    expect(buildLabelSearchQueries(label)).toEqual(['PRUNOTTO BARBARESCO', 'PRUNOTTO', 'BARBARESCO'])
  })

  it('scores producer and wine-name overlap', () => {
    expect(scoreLabelResult(label, { source: 'TEST', producer: 'Prunotto', name: 'Barbaresco' })).toBe(1)
    expect(scoreLabelResult(label, { source: 'TEST', producer: 'Other', name: 'Barolo' })).toBe(0)
  })

  it('searches extracted lines, ranks matches and ignores provider failures', async () => {
    const search = vi.fn(async (query: string) => {
      if (query === 'BARBARESCO') throw new Error('provider unavailable')
      return query === 'PRUNOTTO'
        ? [{ source: 'SYSTEMBOLAGET', producer: 'Prunotto', name: 'Barbaresco', imageUrl: 'https://img.test/prunotto.png' }]
        : [{ source: 'SYSTEMBOLAGET', producer: 'Other', name: 'Barbaresco', imageUrl: 'https://img.test/other.png' }]
    })
    const provider: WineSearchProvider = { search, getById: async () => null }
    const results = await searchRecognizedLabel(label, provider)
    expect(results[0]).toMatchObject({ producer: 'Prunotto', name: 'Barbaresco' })
    expect(search).toHaveBeenCalledTimes(3)
  })

  it('keeps a matching wine even when Systembolaget has no image', async () => {
    const provider: WineSearchProvider = {
      search: async () => [{ source: 'SYSTEMBOLAGET', producer: 'Prunotto', name: 'Barbaresco' }],
      getById: async () => null,
    }
    expect(await searchRecognizedLabel(label, provider)).toHaveLength(1)
  })

  it('reports searches and candidate rejection reasons', async () => {
    const debug = vi.fn()
    const provider: WineSearchProvider = {
      search: async () => [{ source: 'SYSTEMBOLAGET', producer: 'Other', name: 'Barolo' }],
      getById: async () => null,
    }
    expect(await searchRecognizedLabel(label, provider, debug)).toEqual([])
    expect(debug).toHaveBeenCalledWith(expect.objectContaining({
      queries: ['PRUNOTTO BARBARESCO', 'PRUNOTTO', 'BARBARESCO'],
      candidates: [expect.objectContaining({ accepted: false, reason: 'För låg textmatchning (0.00).' })],
    }))
  })
})
