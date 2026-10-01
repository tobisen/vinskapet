<script setup lang="ts">
import { ref } from 'vue'
import { ShoppingBag, Trash2 } from '@lucide/vue'
import InventoryForm from '@/components/InventoryForm.vue'
import ModalShell from '@/components/ModalShell.vue'
import WineCard from '@/components/WineCard.vue'
import { useWineStore } from '@/composables/useWineStore'
import type { InventoryInput, WineSummary } from '@/types/domain'

const store = useWineStore()
const purchasing = ref<WineSummary>()

async function purchase(input: InventoryInput): Promise<void> {
  if (!purchasing.value) return
  if (await store.addInventory(purchasing.value.id, input)) purchasing.value = undefined
}

async function remove(wineId: string): Promise<void> {
  await store.removeFromWishlist(wineId)
}
</script>

<template>
  <main class="page">
    <header class="page-title page-title--split"><div><p class="eyebrow">Nästa fynd</p><h1>Önskelista</h1><p>{{ store.wishlist.value.length }} viner att hålla utkik efter.</p></div></header>
    <div v-if="store.wishlist.value.length" class="wishlist-list">
      <article v-for="wine in store.wishlist.value" :key="wine.id" class="wishlist-entry">
        <WineCard :wine="wine" />
        <div class="wishlist-actions">
          <button class="button button-primary" type="button" @click="purchasing = wine"><ShoppingBag :size="18" aria-hidden="true" /> Jag har köpt det</button>
          <button class="icon-button" type="button" :disabled="store.isSaving.value" aria-label="Ta bort från önskelistan" title="Ta bort från önskelistan" @click="remove(wine.id)"><Trash2 :size="19" aria-hidden="true" /></button>
        </div>
      </article>
    </div>
    <div v-else class="empty-state"><ShoppingBag :size="30" aria-hidden="true" /><h2>Önskelistan är tom</h2><p>Sök på Systembolaget eller lägg till ett vin manuellt.</p><RouterLink class="button button-primary" to="/wine/search">Sök vin</RouterLink></div>
    <ModalShell v-if="purchasing" :title="`Jag har köpt ${purchasing.name}`" @close="purchasing = undefined"><InventoryForm submit-label="Lägg till i samlingen" :saving="store.isSaving.value" :initial-price="purchasing.referencePrice" @submit="purchase" /></ModalShell>
  </main>
</template>
