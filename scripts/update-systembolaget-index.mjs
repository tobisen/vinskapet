import { writeFile } from 'node:fs/promises'

const sitemapUrl = 'https://www.systembolaget.se/sitemap-produkter-vin.xml'
const outputUrl = new URL('../supabase/functions/_shared/systembolaget-wine-index.json', import.meta.url)
const response = await fetch(sitemapUrl, {
  headers: { 'User-Agent': 'Vinskapet/0.1 (private product index update)' },
  signal: AbortSignal.timeout(30_000),
})

if (!response.ok) throw new Error(`Systembolaget sitemap returned ${response.status}`)

const sitemap = await response.text()
const paths = [...sitemap.matchAll(/https:\/\/www\.systembolaget\.se(\/produkt\/vin\/[a-z0-9%_-]+-\d+\/)/gi)]
  .map((match) => match[1])
  .filter(Boolean)

if (paths.length < 1_000) throw new Error(`Product index looks incomplete (${paths.length} URLs)`)

const index = { generatedAt: new Date().toISOString(), paths: [...new Set(paths)].sort() }
await writeFile(outputUrl, `${JSON.stringify(index)}\n`, 'utf8')
console.log(`Wrote ${index.paths.length} wine product URLs to ${outputUrl.pathname}`)
