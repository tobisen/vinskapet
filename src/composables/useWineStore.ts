import { computed, readonly, ref } from 'vue'
import { repositories } from '@/services/repository'
import type { AppData, ConsumeInput, Inventory, InventoryInput, Wine } from '@/types/domain'
import type { WineEnrichmentReport, WineEnrichmentService } from '@/types/search'
import { enrichWineRecord } from '@/services/wineEnrichment'
import { buildWineSummaries, calculateBottleCount, calculateCollectionValue } from '@/utils/wine'
import { logDevelopmentError } from '@/utils/log'

const emptyData = (): AppData => ({ version: 1, wines: [], inventory: [], tastings: [] })
const data = ref<AppData>(emptyData())
const loading = ref(false)
const initialized = ref(false)
const loadError = ref('')
const operationError = ref('')
const pendingAction = ref<string>()
const notice = ref('')

async function fetchData(): Promise<void> {
  const [wines, inventory, tastings] = await Promise.all([
    repositories.wines.getWines(),
    repositories.inventory.getInventory(),
    repositories.tastings.getTastings(),
  ])
  data.value = { version: 1, wines, inventory, tastings }
}

async function loadData(force = false): Promise<void> {
  if (initialized.value && !force) return
  loading.value = true
  loadError.value = ''
  try {
    await fetchData()
    initialized.value = true
  } catch (error) {
    logDevelopmentError('Could not load Supabase collection', error)
    loadError.value = 'Kunde inte ladda samlingen.'
  } finally {
    loading.value = false
  }
}

function clearData(): void {
  data.value = emptyData()
  initialized.value = false
  loadError.value = ''
  operationError.value = ''
  pendingAction.value = undefined
}

function announce(message: string): void {
  notice.value = message
  window.setTimeout(() => {
    if (notice.value === message) notice.value = ''
  }, 2600)
}

async function mutate(action: string, task: () => Promise<void>, success: string, failure: string): Promise<boolean> {
  operationError.value = ''
  pendingAction.value = action
  try {
    await task()
    await fetchData()
    announce(success)
    return true
  } catch (error) {
    logDevelopmentError(`Supabase operation failed: ${action}`, error)
    operationError.value = failure
    return false
  } finally {
    pendingAction.value = undefined
  }
}

export function useWineStore() {
  const summaries = computed(() => buildWineSummaries(data.value.wines, data.value.inventory, data.value.tastings))
  const inStock = computed(() => summaries.value.filter((wine) => wine.quantity > 0))
  const wishlist = computed(() => summaries.value.filter((wine) => wine.status === 'WISHLIST'))
  const bottleCount = computed(() => calculateBottleCount(data.value.inventory))
  const collectionValue = computed(() => calculateCollectionValue(data.value.inventory))
  const isSaving = computed(() => pendingAction.value != null)

  const getWine = (id: string) => summaries.value.find((wine) => wine.id === id)
  const getInventory = (wineId: string) => data.value.inventory.filter((item) => item.wineId === wineId)
  const getTastings = (wineId: string) => data.value.tastings.filter((item) => item.wineId === wineId)

  async function createWine(wine: Wine, inventory?: InventoryInput): Promise<boolean> {
    return mutate('create-wine', async () => {
      await repositories.wines.createWine(wine)
      if (inventory) await repositories.inventory.addInventory(wine.id, inventory)
    }, 'Vinet har lagts till', 'Kunde inte spara vinet. Försök igen.')
  }

  async function updateWine(wine: Wine): Promise<boolean> {
    return mutate('update-wine', async () => {
      await repositories.wines.updateWine(wine)
    }, 'Ändringarna är sparade', 'Kunde inte spara vinet. Försök igen.')
  }

  async function enrichWine(wineId: string, service: WineEnrichmentService): Promise<WineEnrichmentReport | undefined> {
    operationError.value = ''
    pendingAction.value = 'enrich-wine'
    try {
      const wine = data.value.wines.find((item) => item.id === wineId)
      if (!wine) throw new Error('Wine not found')
      const report = await enrichWineRecord(wine, service, (updated) => repositories.wines.updateWine(updated))
      await fetchData()
      if (report.completedFields.length) announce('Vinets metadata har kompletterats')
      return report
    } catch (error) {
      logDevelopmentError('Wine enrichment failed', error)
      operationError.value = 'Kunde inte komplettera vinets metadata.'
      return undefined
    } finally {
      pendingAction.value = undefined
    }
  }

  async function addInventory(wineId: string, input: InventoryInput): Promise<boolean> {
    return mutate('add-inventory', async () => {
      await repositories.inventory.addInventory(wineId, input)
      const wine = await repositories.wines.getWine(wineId)
      if (wine && wine.status !== 'COLLECTION') {
        await repositories.wines.updateWine({ ...wine, status: 'COLLECTION', updatedAt: new Date().toISOString() })
      }
    }, input.quantity === 1 ? 'En flaska har lagts till' : `${input.quantity} flaskor har lagts till`, 'Kunde inte lägga till flaskorna. Försök igen.')
  }

  async function correctInventory(wineId: string, items: Inventory[], totalQuantity: number): Promise<boolean> {
    return mutate('correct-inventory', async () => {
      if (items.length) await repositories.inventory.correctInventory(items, totalQuantity)
      else if (totalQuantity > 0) await repositories.inventory.addInventory(wineId, { quantity: totalQuantity, storageLocation: 'OTHER' })
    }, 'Antalet har korrigerats', 'Kunde inte korrigera antalet. Försök igen.')
  }

  async function consumeBottle(wineId: string, input: ConsumeInput): Promise<boolean> {
    return mutate('consume-bottle', async () => {
      await repositories.inventory.consumeBottle(wineId, input)
    }, 'Flaskan är registrerad som drucken', 'Kunde inte registrera flaskan som drucken.')
  }

  async function addToWishlist(wineId: string): Promise<boolean> {
    return mutate('add-wishlist', async () => {
      await repositories.wines.addToWishlist(wineId)
    }, 'Vinet finns nu på önskelistan', 'Kunde inte uppdatera önskelistan.')
  }

  async function removeFromWishlist(wineId: string): Promise<boolean> {
    return mutate('remove-wishlist', async () => {
      await repositories.wines.removeFromWishlist(wineId)
    }, 'Vinet har tagits bort från önskelistan', 'Kunde inte uppdatera önskelistan.')
  }

  return {
    data: readonly(data), loading: readonly(loading), initialized: readonly(initialized),
    loadError: readonly(loadError), operationError: readonly(operationError), pendingAction: readonly(pendingAction),
    isSaving, notice: readonly(notice), summaries, inStock, wishlist, bottleCount, collectionValue,
    getWine, getInventory, getTastings, loadData, clearData, createWine, updateWine, enrichWine,
    addInventory, correctInventory, consumeBottle, addToWishlist, removeFromWishlist,
  }
}
