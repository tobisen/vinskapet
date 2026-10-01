import type { WineSearchProvider, WineSearchResult } from '@/types/search'
import { mergeSearchResults } from '@/search/CompositeWineSearchProvider'

export interface LabelRecognitionProgress {
  progress: number
  status: string
}

export interface LabelSearchDebug {
  queries: string[]
  searches: Array<{ query: string; matches: number; error?: string }>
  candidates: Array<{ name: string; producer?: string; productNumber?: string; score: number; accepted: boolean; reason: string }>
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

export function buildLabelSearchQueries(text: string, limit = 6): string[] {
  const lines = extractLabelSearchQueries(text)
  const combined = lines.slice(0, 3).flatMap((line, index) => {
    const next = lines[index + 1]
    return next ? [`${line} ${next}`] : []
  })
  return [...new Set([...combined, ...lines])].slice(0, limit)
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
  onDebug?: (debug: LabelSearchDebug) => void,
): Promise<WineSearchResult[]> {
  const queries = buildLabelSearchQueries(text)
  const settled = await Promise.allSettled(queries.map((query) => provider.search(query)))
  const searches = settled.map((result, index) => result.status === 'fulfilled'
    ? { query: queries[index] ?? '', matches: result.value.length }
    : { query: queries[index] ?? '', matches: 0, error: result.reason instanceof Error ? result.reason.message : String(result.reason) })
  const candidates = mergeSearchResults(settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []))
    .map((result) => ({ result, score: scoreLabelResult(text, result) }))
    .sort((a, b) => b.score - a.score)

  onDebug?.({
    queries,
    searches,
    candidates: candidates.map(({ result, score }) => ({
      name: result.name,
      producer: result.producer,
      productNumber: result.productNumber,
      score,
      accepted: score >= 0.34,
      reason: score >= 0.34 ? 'Tillräcklig textmatchning.' : `För låg textmatchning (${score.toFixed(2)}).`,
    })),
  })

  return candidates
    .filter(({ score }) => score >= 0.34)
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
