import { classifyWineForDrinking } from '@/domain/drinking'
import { inferFoodPairings } from '@/domain/enrichment/foodPairingRules'
import { createEnrichmentContext } from '@/domain/enrichment/matching'
import type { DrinkClassification, WineSummary, WineType } from '@/types/domain'

export const foodCategories = [
  'BEEF',
  'LAMB',
  'PORK',
  'CHICKEN',
  'FISH',
  'SHELLFISH',
  'PASTA',
  'VEGETARIAN',
  'MUSHROOM',
  'CHEESE',
  'SPICY',
] as const

export type FoodCategory = typeof foodCategories[number]
type FoodTag = FoodCategory | 'GRILLED' | 'RICH' | 'MEAT'
export type FoodMatchTier = 'BEST_MATCH' | 'ALTERNATIVE' | 'SAVE_FOR_LATER'

export const foodCategoryLabels: Record<FoodCategory, string> = {
  BEEF: 'Nötkött',
  LAMB: 'Lamm',
  PORK: 'Fläsk',
  CHICKEN: 'Kyckling',
  FISH: 'Fisk',
  SHELLFISH: 'Skaldjur',
  PASTA: 'Pasta',
  VEGETARIAN: 'Vegetariskt',
  MUSHROOM: 'Svamp',
  CHEESE: 'Ost',
  SPICY: 'Kryddstarkt',
}

const tagLabels: Record<FoodTag, string> = {
  ...foodCategoryLabels,
  GRILLED: 'grillat',
  RICH: 'fylliga och feta smaker',
  MEAT: 'kött',
}

const patterns: Array<{ tag: FoodTag; terms: string[] }> = [
  { tag: 'BEEF', terms: ['nötkött', 'notkott', 'entrecote', 'entrecôte', 'oxfile', 'oxfilé', 'biff', 'steak', 'burgare', 'hamburgare', 'beef'] },
  { tag: 'LAMB', terms: ['lamm', 'lammracks', 'lammkotlett'] },
  { tag: 'PORK', terms: ['fläsk', 'flask', 'griskött', 'gris', 'fläskfile', 'fläskfilé', 'chark', 'korv'] },
  { tag: 'CHICKEN', terms: ['kyckling', 'fågel', 'fagel', 'kalkon'] },
  { tag: 'SHELLFISH', terms: ['skaldjur', 'räka', 'räkor', 'raka', 'rakor', 'kräfta', 'kräftor', 'krabba', 'hummer', 'mussla', 'musslor', 'ostron'] },
  { tag: 'FISH', terms: ['fisk', 'lax', 'torsk', 'tonfisk', 'röding', 'roding', 'abborre', 'sill'] },
  { tag: 'PASTA', terms: ['pasta', 'spaghetti', 'tagliatelle', 'lasagne', 'lasagna', 'ravioli', 'pizza'] },
  { tag: 'VEGETARIAN', terms: ['vegetarisk', 'vegetariskt', 'vego', 'grönsak', 'gronsak', 'sallad', 'aubergine', 'zucchini'] },
  { tag: 'MUSHROOM', terms: ['svamp', 'kantarell', 'champinjon', 'karljohan', 'tryffel'] },
  { tag: 'CHEESE', terms: ['ost', 'ostar', 'parmesan', 'pecorino', 'brie', 'chevre', 'chèvre', 'gorgonzola', 'gruyere', 'gruyère'] },
  { tag: 'SPICY', terms: ['kryddstark', 'stark mat', 'chili', 'curry', 'thai', 'indisk', 'asiatisk', 'szechuan'] },
  { tag: 'GRILLED', terms: ['grillad', 'grillat', 'grill', 'bbq', 'barbecue'] },
  { tag: 'RICH', terms: ['bearnaise', 'béarnaise', 'grädd', 'gradd', 'smör', 'smor', 'fet', 'fyllig', 'krämig', 'kramig'] },
  { tag: 'MEAT', terms: ['kött', 'kott', 'vilt', 'långkok', 'langkok'] },
]

const genericRuleIds = new Set(['RED_FOOD', 'WHITE_FOOD', 'ROSE_FOOD', 'GENERIC_FOOD'])
const typeCompatibility: Partial<Record<WineType, FoodTag[]>> = {
  RED: ['BEEF', 'LAMB', 'PORK', 'MUSHROOM', 'CHEESE', 'GRILLED', 'RICH', 'MEAT'],
  WHITE: ['CHICKEN', 'FISH', 'SHELLFISH', 'VEGETARIAN', 'MUSHROOM', 'SPICY'],
  ROSE: ['CHICKEN', 'FISH', 'SHELLFISH', 'VEGETARIAN'],
  SPARKLING_WHITE: ['FISH', 'SHELLFISH', 'CHEESE'],
  SPARKLING_ROSE: ['FISH', 'SHELLFISH', 'CHEESE'],
  ORANGE: ['CHICKEN', 'PORK', 'VEGETARIAN', 'MUSHROOM', 'CHEESE', 'SPICY'],
  DESSERT: ['CHEESE'],
  FORTIFIED: ['CHEESE', 'RICH'],
}

export interface FoodIntent {
  text: string
  categories: FoodCategory[]
  tags: FoodTag[]
}

export interface FoodWineRecommendation {
  wine: WineSummary
  tier: FoodMatchTier
  explanation: string
  matchedCategories: FoodCategory[]
  maturity: DrinkClassification
  score: number
}

export interface FoodMatchResult {
  intent: FoodIntent
  recommendations: FoodWineRecommendation[]
  suggestedStyle: string
}

const normalize = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('sv-SE')

function tagsFromText(value: string): FoodTag[] {
  const text = normalize(value)
  return patterns.filter(({ terms }) => terms.some((term) => text.includes(normalize(term)))).map(({ tag }) => tag)
}

export function parseFoodIntent(text: string, selected: readonly FoodCategory[] = []): FoodIntent {
  const tags = [...new Set<FoodTag>([...selected, ...tagsFromText(text)])]
  return {
    text: text.trim(),
    categories: foodCategories.filter((category) => tags.includes(category)),
    tags,
  }
}

function tagsMatch(target: FoodTag, candidate: FoodTag): boolean {
  if (target === candidate) return true
  if (candidate === 'MEAT') return ['BEEF', 'LAMB', 'PORK'].includes(target)
  if (target === 'MEAT') return ['BEEF', 'LAMB', 'PORK'].includes(candidate)
  return false
}

function overlaps(targets: readonly FoodTag[], candidates: readonly FoodTag[]): FoodTag[] {
  return targets.filter((target) => candidates.some((candidate) => tagsMatch(target, candidate)))
}

function maturityAdjustment(classification: DrinkClassification, wine: WineSummary, year: number): number {
  if (classification === 'DRINK_NOW') return 5
  if (classification === 'DRINK_SOON') return 3
  if (classification === 'CAN_DRINK') return 2
  if (classification === 'WAIT') {
    const start = wine.optimalDrinkingStart ?? wine.drinkingWindowStart
    return start != null && start >= year + 2 ? -12 : -7
  }
  return 0
}

function maturitySentence(classification: DrinkClassification, wine: WineSummary): string {
  if (classification === 'DRINK_NOW') return 'Vinet är dessutom i optimal period.'
  if (classification === 'DRINK_SOON') return 'Vinet bör prioriteras i närtid.'
  if (classification === 'CAN_DRINK') return 'Vinet är i ett bra drickläge.'
  if (classification === 'WAIT') {
    const start = wine.optimalDrinkingStart ?? wine.drinkingWindowStart
    return start ? `Vinet mår bäst av att sparas till ${start}.` : 'Vinet bör sparas lite längre.'
  }
  return 'Drickläget är inte bedömt.'
}

function naturalList(values: string[]): string {
  if (values.length < 2) return values[0] ?? 'maten'
  return `${values.slice(0, -1).join(', ')} och ${values.at(-1)}`
}

function suggestedStyle(categories: readonly FoodCategory[]): string {
  if (categories.some((category) => ['BEEF', 'LAMB'].includes(category))) return 'Ett strukturerat rött vin med frisk syra, exempelvis Nebbiolo eller Syrah.'
  if (categories.includes('PORK')) return 'Ett medelfylligt rött vin eller ett smakrikt vitt vin med frisk syra.'
  if (categories.some((category) => ['FISH', 'SHELLFISH'].includes(category))) return 'Ett friskt, torrt vitt vin eller ett mousserande vin.'
  if (categories.includes('SPICY')) return 'Ett aromatiskt vitt vin med frisk syra och gärna lite restsötma, exempelvis Riesling.'
  if (categories.some((category) => ['MUSHROOM', 'PASTA'].includes(category))) return 'Ett elegant rött vin med frisk syra eller ett fylligare vitt vin.'
  if (categories.includes('CHEESE')) return 'Vinvalet beror på osten, men ett fylligt vitt, moget rött eller starkvin är ofta en bra riktning.'
  if (categories.includes('VEGETARIAN')) return 'Ett friskt vitt vin, rosé eller ett lättare rött vin beroende på tillagningen.'
  return 'Komplettera gärna maträtten med råvara eller tillagningssätt för ett säkrare vinval.'
}

export class WineFoodMatcher {
  match(
    wines: readonly WineSummary[],
    input: { text?: string; categories?: readonly FoodCategory[] },
    currentDate = new Date(),
  ): FoodMatchResult {
    const intent = parseFoodIntent(input.text ?? '', input.categories ?? [])
    const year = currentDate.getFullYear()
    const ranked = wines
      .filter((wine) => wine.quantity > 0)
      .flatMap<FoodWineRecommendation>((wine) => {
        const directTags = tagsFromText(wine.foodPairings.join(' '))
        const inferred = inferFoodPairings(createEnrichmentContext({ ...wine, source: 'COLLECTION' }))
        const inferredTags = tagsFromText(inferred.value.join(' '))
        const directMatches = overlaps(intent.tags, directTags)
        const inferredMatches = overlaps(intent.tags, inferredTags).filter((tag) => !directMatches.includes(tag))
        const typeMatches = overlaps(intent.tags, typeCompatibility[wine.wineType] ?? [])
          .filter((tag) => !directMatches.includes(tag) && !inferredMatches.includes(tag))
        const specificRule = !genericRuleIds.has(inferred.ruleId)
        const foodScore = directMatches.length * 12 + inferredMatches.length * (specificRule ? 7 : 3)
        if (foodScore < 6) return []

        const styleScore = specificRule ? inferredMatches.length * 2 : Math.min(typeMatches.length, 2)
        const maturity = classifyWineForDrinking(wine, currentDate).classification
        const score = foodScore + styleScore + maturityAdjustment(maturity, wine, year)
        const matchedTags = [...new Set([...directMatches, ...inferredMatches])]
        const matchedCategories = foodCategories.filter((category) => matchedTags.includes(category))
        const labels = matchedTags.slice(0, 3).map((tag) => tagLabels[tag].toLocaleLowerCase('sv-SE'))
        const tier: FoodMatchTier = maturity === 'WAIT' ? 'SAVE_FOR_LATER' : 'ALTERNATIVE'
        return [{
          wine,
          tier,
          explanation: `Bra till ${naturalList(labels)}. ${maturitySentence(maturity, wine)}`,
          matchedCategories,
          maturity,
          score,
        }]
      })
      .sort((a, b) =>
        Number(a.tier === 'SAVE_FOR_LATER') - Number(b.tier === 'SAVE_FOR_LATER')
        || b.score - a.score
        || b.matchedCategories.length - a.matchedCategories.length
        || a.wine.name.localeCompare(b.wine.name, 'sv'),
      )
      .slice(0, 5)

    const best = ranked.find((item) => item.tier !== 'SAVE_FOR_LATER')
    if (best) best.tier = 'BEST_MATCH'

    return {
      intent,
      recommendations: ranked,
      suggestedStyle: suggestedStyle(intent.categories),
    }
  }
}
