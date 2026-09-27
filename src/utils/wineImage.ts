import type { Wine, WineType } from '@/types/domain'
import type { WineSearchResult } from '@/types/search'

export function isAllowedImageUrl(value?: string): value is string {
  if (!value) return false
  const trimmed = value.trim()
  return trimmed.length > 0 && /^https?:\/\//i.test(trimmed)
}

export function normalizeWineImageUrl(value?: string): string | undefined {
  if (!isAllowedImageUrl(value)) return undefined
  return value.trim()
}

export function getWinePlaceholderVariant(wineType?: WineType): string {
  const variants: Record<WineType, string> = {
    RED: 'red',
    WHITE: 'white',
    ROSE: 'rose',
    SPARKLING_WHITE: 'sparkling-white',
    SPARKLING_ROSE: 'sparkling-rose',
    ORANGE: 'orange',
    DESSERT: 'dessert',
    FORTIFIED: 'fortified',
  }
  return variants[wineType ?? 'RED'] ?? 'red'
}

export function applyWineSearchResultImage(wine: Wine, result?: Pick<WineSearchResult, 'imageUrl'> | null): Wine {
  const imageUrl = normalizeWineImageUrl(result?.imageUrl)
  if (!imageUrl || wine.image) return wine
  return { ...wine, image: imageUrl }
}

export function preferWineImage(existingImage?: string, candidateImage?: string): string | undefined {
  if (existingImage && existingImage.trim()) return existingImage.trim()
  return normalizeWineImageUrl(candidateImage)
}
