import { describe, expect, it } from 'vitest'
import { eanFormat, isValidEan, normalizeEan } from './barcode'

describe('EAN utilities', () => {
  it('normalizes spaces and dashes', () => {
    expect(normalizeEan('400 6381-333 931')).toBe('4006381333931')
  })

  it('validates EAN-13 checksums', () => {
    expect(isValidEan('4006381333931')).toBe(true)
    expect(eanFormat('4006381333931')).toBe('EAN-13')
    expect(isValidEan('4006381333932')).toBe(false)
  })

  it('validates EAN-8 checksums', () => {
    expect(isValidEan('96385074')).toBe(true)
    expect(eanFormat('96385074')).toBe('EAN-8')
    expect(isValidEan('96385075')).toBe(false)
  })

  it('rejects unsupported lengths and non-digits', () => {
    expect(isValidEan('1234567')).toBe(false)
    expect(isValidEan('40063813339AB')).toBe(false)
  })
})
