export function normalizeEan(value: string): string {
  return value.replace(/[\s-]/g, '')
}

export function isValidEan(value: string): boolean {
  const normalized = normalizeEan(value)
  if (!/^\d{8}$|^\d{13}$/.test(normalized)) return false

  const digits = [...normalized].map(Number)
  const checkDigit = digits.pop()
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === checkDigit
}

export function eanFormat(value: string): 'EAN-8' | 'EAN-13' | null {
  const normalized = normalizeEan(value)
  if (!isValidEan(normalized)) return null
  return normalized.length === 8 ? 'EAN-8' : 'EAN-13'
}
