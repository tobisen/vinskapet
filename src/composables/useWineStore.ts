import { computed, readonly, ref } from 'vue'
import { repository } from '@/services/repository'
import type { ConsumeInput, Inventory, InventoryInput, Wine } from '@/types/domain'
import { buildWineSummaries, calculateBottleCount, calculateCollectionValue } from '@/utils/wine'

const data = ref(repository.getData())
const notice = ref('')

function reload(): void {
  data.value = repository.getData()
}

function announce(message: string): void {
  notice.value = message
  window.setTimeout(() => {
    if (notice.value === message) notice.value = ''
  }, 2600)
}

export function useWineStore() {
  const summaries = computed(() => buildWineSummaries(data.value.wines, data.value.inventory, data.value.tastings))
  const inStock = computed(() => summaries.value.filter((wine) => wine.quantity > 0))
  const wishlist = computed(() => summaries.value.filter((wine) => wine.status === 'WISHLIST'))
  const bottleCount = computed(() => calculateBottleCount(data.value.inventory))
  const collectionValue = computed(() => calculateCollectionValue(data.value.inventory))

  const getWine = (id: string) => summaries.value.find((wine) => wine.id === id)
  const getInventory = (wineId: string) => data.value.inventory.filter((item) => item.wineId === wineId)
  const getTastings = (wineId: string) => data.value.tastings.filter((item) => item.wineId === wineId)

  function createWine(wine: Wine, inventory?: InventoryInput): void {
    repository.createWine(wine)
    if (inventory) repository.addInventory(wine.id, inventory)
    reload()
    announce('Vinet har lagts till')
  }

  function updateWine(wine: Wine): void {
    repository.updateWine(wine)
    reload()
    announce('Ändringarna är sparade')
  }

  function addInventory(wineId: string, input: InventoryInput): void {
    repository.addInventory(wineId, input)
    reload()
    announce(input.quantity === 1 ? 'En flaska har lagts till' : `${input.quantity} flaskor har lagts till`)
  }

  function updateInventory(item: Inventory): void {
    repository.updateInventory(item)
    reload()
    announce('Antalet har korrigerats')
  }

  function consumeBottle(wineId: string, input: ConsumeInput): void {
    repository.consumeBottle(wineId, input)
    reload()
    announce('Flaskan är registrerad som drucken')
  }

  function addToWishlist(wineId: string): void {
    repository.addToWishlist(wineId)
    reload()
    announce('Vinet finns nu på önskelistan')
  }

  function removeFromWishlist(wineId: string): void {
    repository.removeFromWishlist(wineId)
    reload()
    announce('Vinet har tagits bort från önskelistan')
  }

  return {
    data: readonly(data), notice: readonly(notice), summaries, inStock, wishlist, bottleCount,
    collectionValue, getWine, getInventory, getTastings, createWine, updateWine,
    addInventory, updateInventory, consumeBottle, addToWishlist, removeFromWishlist,
  }
}
