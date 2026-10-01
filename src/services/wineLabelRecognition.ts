import type { WineSearchProvider, WineSearchResult } from '@/types/search'
import { mergeSearchResults } from '@/search/CompositeWineSearchProvider'

export interface LabelRecognitionProgress {
  progress: number
  status: string
}

const ignoredLines = new Set([
  'alc', 'alcohol', 'bottled by', 'contains sulfites', 'contient des sulfites',
  'mis en bouteille', 'product of', 'produced by', 'vino', 'vin', 'wine',
])

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('sv-SE')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokens(value: string): string[] {
  return normalize(value).split(' ').filter((token) => token.length > 2)
}

export function extractLabelSearchQueries(text: string, limit = 5): string[] {
  const unique = new Map<string, string>()
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim()
    const normalized = normalize(line)
    if (line.length < 3 || line.length > 60 || !/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(line)) continue
    if (ignoredLines.has(normalized) || /\b(?:%\s*vol|vol\.?|ml|cl)\b/i.test(line)) continue
    if (/^\d+(?:[.,]\d+)?\s*(?:%|ml|cl|l)?$/i.test(line)) continue
    if (!unique.has(normalized)) unique.set(normalized, line)
  }
  return [...unique.values()]
    .sort((a, b) => Number(/\b(?:19|20)\d{2}\b/.test(a)) - Number(/\b(?:19|20)\d{2}\b/.test(b)))
    .slice(0, limit)
}

export function scoreLabelResult(text: string, result: WineSearchResult): number {
  const recognized = new Set(tokens(text))
  const identity = [...new Set(tokens(`${result.producer ?? ''} ${result.name}`))]
  if (!identity.length) return 0
  return identity.filter((token) => recognized.has(token)).length / identity.length
}

export async function searchRecognizedLabel(
  text: string,
  provider: WineSearchProvider,
): Promise<WineSearchResult[]> {
  const queries = extractLabelSearchQueries(text)
  const settled = await Promise.allSettled(queries.map((query) => provider.search(query)))
  return mergeSearchResults(settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []))
    .map((result) => ({ result, score: scoreLabelResult(text, result) }))
    .filter(({ result, score }) => Boolean(result.imageUrl) && score >= 0.34)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ result }) => result)
}

export async function recognizeLabelText(
  image: File,
  onProgress?: (progress: LabelRecognitionProgress) => void,
): Promise<string> {
  const { createWorker, OEM, PSM } = await import('tesseract.js')
  const worker = await createWorker('eng', OEM.DEFAULT, {
    logger: (message) => onProgress?.({ progress: message.progress, status: message.status }),
  })
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: '1' })
    const { data } = await worker.recognize(image, { rotateAuto: true })
    return data.text.trim()
  } finally {
    await worker.terminate()
  }
}
