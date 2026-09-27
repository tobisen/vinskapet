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
import { SystembolagetWineSearchProvider } from '@/search/SystembolagetWineSearchProvider'
import { findDuplicateWine, saveWinePurchase } from '@/search/duplicates'
import { wineFromSearchResult } from '@/search/wineFromSearchResult'
import type { InventoryInput, WineType } from '@/types/domain'
import type { WineSearchResult } from '@/types/search'
import { formatCurrency } from '@/utils/format'
import { supabase } from '@/services/supabase'
import { wineEnrichmentService } from '@/services/wineEnrichment'

const route = useRoute()
const router = useRouter()
const store = useWineStore()
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const results = ref<WineSearchResult[]>([])
const selected = ref<WineSearchResult>()
const loading = ref(false)
const searched = ref(false)
const externalError = ref(false)
const confirmedVintage = ref<number>()
const confirmedWineType = ref<WineType>()
const selectionError = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | undefined

const systembolagetProvider = new SystembolagetWineSearchProvider(
  (name, options) => supabase.functions.invoke(name, options),
  () => { externalError.value = true },
)
const provider = new CompositeWineSearchProvider([
  new LocalCollectionWineSearchProvider(() => store.summaries.value),
  systembolagetProvider,
])
const latestSearch = new LatestWineSearch(provider)
const manualTarget = computed(() => ({ path: '/wine/manual', query: query.value.trim() ? { name: query.value.trim() } : undefined }))

watch(query, (value) => {
  clearTimeout(debounceTimer)
  selected.value = undefined
  externalError.value = false
  if (value.trim().length < 3) {
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
  }, 450)
}, { immediate: true })

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
  latestSearch.cancel()
})

async function addInventory(input: InventoryInput): Promise<void> {
  const wine = selected.value?.existingWine
  if (wine && await store.addInventory(wine.id, input)) await router.push(`/wine/${wine.id}`)
}

function selectResult(result: WineSearchResult): void {
  selected.value = result
  confirmedVintage.value = result.vintage
  confirmedWineType.value = result.wineType
  selectionError.value = ''
}

async function addExternalPurchase(input: InventoryInput): Promise<void> {
  const result = selected.value
  if (!result || result.existingWine) return
  if (!result.producer || !confirmedWineType.value) {
    selectionError.value = 'Producent och vintyp måste anges. Lägg till vinet manuellt om uppgifterna saknas.'
    return
  }
  const wine = wineFromSearchResult(result, confirmedVintage.value, confirmedWineType.value)
  const duplicate = findDuplicateWine(result, store.summaries.value)
  const saved = await saveWinePurchase(wine, input, duplicate, {
    createWine: store.createWine,
    addInventory: store.addInventory,
  })
  if (saved.saved) {
    if (!duplicate) void store.enrichWine(saved.wineId, wineEnrichmentService, { silent: true })
    await router.push(`/wine/${saved.wineId}`)
  }
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

      <div v-else-if="selected" class="quick-add-panel external-wine-panel">
        <button class="text-button" type="button" @click="selected = undefined"><ArrowLeft :size="17" /> Till resultat</button>
        <div class="external-wine-panel__heading">
          <WineImage :src="selected.imageUrl" :wine-type="selected.wineType" size="md" :alt="`${selected.producer ?? 'Vin'} ${selected.name}`" />
          <div><p class="eyebrow">Systembolaget · Nr {{ selected.productNumber }}</p><h2>{{ selected.name }}</h2><p>{{ selected.producer }}<span v-if="selected.region || selected.country"> · {{ [selected.region, selected.country].filter(Boolean).join(', ') }}</span></p></div>
        </div>
        <div class="external-wine-panel__facts">
          <span v-if="selected.grapes?.length"><small>Druvor</small><strong>{{ selected.grapes.join(', ') }}</strong></span>
          <span v-if="selected.alcoholPercentage"><small>Alkohol</small><strong>{{ selected.alcoholPercentage }} %</strong></span>
          <span v-if="selected.referencePrice"><small>Referenspris</small><strong>{{ formatCurrency(selected.referencePrice, selected.currency) }}</strong></span>
        </div>
        <div class="field-row">
          <label class="field"><span>Bekräfta årgång</span><input v-model.number="confirmedVintage" type="number" min="1900" max="2100" inputmode="numeric" :placeholder="selected.vintage ? String(selected.vintage) : 'Årgång på flaskan'" /><small>Kan skilja sig från produktsidan.</small></label>
          <label class="field"><span>Vintyp</span><select v-model="confirmedWineType"><option :value="undefined" disabled>Välj vintyp</option><option value="RED">Rött</option><option value="WHITE">Vitt</option><option value="ROSE">Rosé</option><option value="SPARKLING_WHITE">Mousserande</option><option value="SPARKLING_ROSE">Mousserande rosé</option><option value="ORANGE">Orange</option><option value="DESSERT">Dessertvin</option><option value="FORTIFIED">Starkvin</option></select></label>
        </div>
        <p v-if="selectionError" class="form-error" role="alert">{{ selectionError }}</p>
        <InventoryForm submit-label="Lägg till i samlingen" :saving="store.isSaving.value" :initial-price="selected.referencePrice" @submit="addExternalPurchase" />
      </div>

      <template v-else>
        <p v-if="loading" class="search-feedback" role="status">Söker i samlingen och på Systembolaget…</p>
        <template v-else>
          <p v-if="externalError" class="form-error" role="alert">Kunde inte söka hos Systembolaget just nu. Lokala träffar visas fortfarande.</p>
          <div v-if="results.length" class="search-results">
            <button v-for="result in results" :key="`${result.source}-${result.externalId ?? result.productNumber ?? result.name}`" type="button" @click="selectResult(result)">
              <WineImage :src="result.imageUrl" :wine-type="result.wineType" size="sm" :alt="`${result.producer ?? 'Vin'} ${result.name}`" />
              <span><small>{{ result.producer }}</small><strong>{{ result.name }} <b v-if="result.vintage">{{ result.vintage }}</b></strong><em>{{ [result.region, result.country].filter(Boolean).join(' · ') }}</em></span>
              <span class="search-result__aside"><WineTypeBadge v-if="result.wineType" :type="result.wineType" /><small>{{ result.source === 'LOCAL_COLLECTION' ? `Finns redan · ${result.quantity}` : `Systembolaget · Nr ${result.productNumber}` }}</small><b v-if="result.referencePrice">{{ formatCurrency(result.referencePrice, result.currency) }}</b></span>
            </button>
          </div>
          <div v-else-if="searched && !externalError" class="empty-state search-empty"><Search :size="28" aria-hidden="true" /><h2>{{ route.query.barcode ? 'Streckkoden kunde läsas, men vi hittade ingen matchande produkt.' : 'Ingen produkt hittades på Systembolaget.' }}</h2><p>Prova ett artikelnummer, ett annat sökord eller lägg till vinet manuellt.</p><RouterLink class="button button-primary" :to="manualTarget">Lägg till manuellt</RouterLink></div>
        </template>
      </template>
    </div>
  </main>
</template>
