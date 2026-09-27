<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowLeft, Search } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import InventoryForm from '@/components/InventoryForm.vue'
import WineImage from '@/components/WineImage.vue'
import WineTypeBadge from '@/components/WineTypeBadge.vue'
import { useWineStore } from '@/composables/useWineStore'
import { CompositeWineSearchProvider } from '@/search/CompositeWineSearchProvider'
import { LatestWineSearch } from '@/search/LatestWineSearch'
import { LocalCollectionWineSearchProvider } from '@/search/LocalCollectionWineSearchProvider'
import type { InventoryInput } from '@/types/domain'
import type { WineSearchResult } from '@/types/search'
import { formatCurrency } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const store = useWineStore()
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const results = ref<WineSearchResult[]>([])
const selected = ref<WineSearchResult>()
const loading = ref(false)
const searched = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | undefined

const provider = new CompositeWineSearchProvider([
  new LocalCollectionWineSearchProvider(() => store.summaries.value),
])
const latestSearch = new LatestWineSearch(provider)
const manualTarget = computed(() => ({ path: '/wine/manual', query: query.value.trim() ? { name: query.value.trim() } : undefined }))

watch(query, (value) => {
  clearTimeout(debounceTimer)
  selected.value = undefined
  if (!value.trim()) {
    latestSearch.cancel()
    results.value = []
    searched.value = false
    loading.value = false
    return
  }
  loading.value = true
  debounceTimer = setTimeout(async () => {
    const response = await latestSearch.search(value)
    if (response.stale) return
    results.value = response.results
    loading.value = false
    searched.value = true
  }, 220)
}, { immediate: true })

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
  latestSearch.cancel()
})

async function addInventory(input: InventoryInput): Promise<void> {
  const wine = selected.value?.existingWine
  if (wine && await store.addInventory(wine.id, input)) await router.push(`/wine/${wine.id}`)
}
</script>

<template>
  <main class="form-page search-wine-page">
    <header class="form-page__header"><button class="back-link" type="button" @click="router.back()"><ArrowLeft :size="19" aria-hidden="true" /> Tillbaka</button></header>
    <div class="form-page__content">
      <div><p class="eyebrow">Hitta rätt flaska</p><h1>Sök vin</h1></div>
      <label class="search-field search-field--large"><Search :size="20" aria-hidden="true" /><span class="sr-only">Sök vin, producent eller artikelnummer</span><input v-model="query" autofocus placeholder="Vin, producent eller artikelnummer" autocomplete="off" /></label>

      <div v-if="selected?.existingWine" class="quick-add-panel">
        <button class="text-button" type="button" @click="selected = undefined"><ArrowLeft :size="17" /> Till resultat</button>
        <div><p class="eyebrow">Finns i samlingen</p><h2>{{ selected.name }} <span v-if="selected.vintage">{{ selected.vintage }}</span></h2><p>{{ selected.producer }} · {{ selected.quantity }} {{ selected.quantity === 1 ? 'flaska' : 'flaskor' }}</p></div>
        <InventoryForm submit-label="Lägg till flaskor" :saving="store.isSaving.value" :initial-price="selected.referencePrice" @submit="addInventory" />
      </div>

      <template v-else>
        <p v-if="loading" class="search-feedback" role="status">Söker i din samling…</p>
        <div v-else-if="results.length" class="search-results">
          <button v-for="result in results" :key="`${result.source}-${result.externalId}`" type="button" @click="selected = result">
            <WineImage :src="result.imageUrl" :wine-type="result.wineType" size="sm" :alt="`${result.producer ?? 'Vin'} ${result.name}`" />
            <span><small>{{ result.producer }}</small><strong>{{ result.name }} <b v-if="result.vintage">{{ result.vintage }}</b></strong><em>{{ [result.region, result.country].filter(Boolean).join(' · ') }}</em></span>
            <span class="search-result__aside"><WineTypeBadge v-if="result.wineType" :type="result.wineType" /><small>Finns redan · {{ result.quantity }}</small><b v-if="result.referencePrice">{{ formatCurrency(result.referencePrice, result.currency) }}</b></span>
          </button>
        </div>
        <div v-else-if="searched" class="empty-state search-empty"><Search :size="28" aria-hidden="true" /><h2>Inga viner hittades</h2><p>Sökningen omfattar din egen samling. Extern Systembolaget-sökning är inte ansluten ännu.</p><RouterLink class="button button-primary" :to="manualTarget">Lägg till manuellt</RouterLink></div>
      </template>
    </div>
  </main>
</template>
