export const formatCurrency = (value?: number, currency = 'SEK'): string =>
  value == null
    ? 'Pris saknas'
    : new Intl.NumberFormat('sv-SE', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(value)

export const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  )

export const todayIso = (): string => new Date().toISOString().slice(0, 10)
