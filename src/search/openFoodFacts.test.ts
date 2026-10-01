import { describe, expect, it, vi } from 'vitest'
import { FreeBarcodeSearchProvider } from './FreeBarcodeSearchProvider'

describe('free barcode provider', () => {
  it('returns a wine found by normalized EAN', async () => {
    const invoke = vi.fn(async () => ({ data: { result: { source: 'OPEN_FOOD_FACTS', name: 'Test Wine' } }, error: null }))
    const provider = new FreeBarcodeSearchProvider(invoke)
    expect(await provider.lookupBarcode('400 6381-333 931')).toEqual([{ source: 'OPEN_FOOD_FACTS', name: 'Test Wine' }])
    expect(invoke).toHaveBeenCalledWith('barcode-lookup', { body: { barcode: '4006381333931' } })
  })

  it('returns no match and rejects provider errors', async () => {
    const missing = new FreeBarcodeSearchProvider(async () => ({ data: { result: null }, error: null }))
    expect(await missing.lookupBarcode('4006381333931')).toEqual([])
    const broken = new FreeBarcodeSearchProvider(async () => ({ data: null, error: new Error('offline') }))
    await expect(broken.lookupBarcode('4006381333931')).rejects.toThrow('barcode lookup failed')
  })
})
