export function logDevelopmentError(message: string, error: unknown): void {
  if (import.meta.env.DEV) console.error(message, error)
}
