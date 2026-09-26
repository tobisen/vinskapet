<script setup lang="ts">
import { computed, ref } from 'vue'
import { CircleDollarSign, GlassWater, LibraryBig, Search } from '@lucide/vue'
import CollectionControls from '@/components/CollectionControls.vue'
import WineCard from '@/components/WineCard.vue'
import { useWineStore } from '@/composables/useWineStore'
import type { GroupMode, WineFilters, WineSort } from '@/types/domain'
import { formatCurrency } from '@/utils/format'
import { filterWines, groupWines, sortWines } from '@/utils/wine'

const store = useWineStore()
const filters = ref<WineFilters>({ query: '', wineType: 'ALL', country: '', region: '', vintage: 'ALL', drinkingStatus: 'ALL', storageLocation: 'ALL', availability: 'IN_STOCK' })
const sort = ref<WineSort>('DRINK_PRIORITY')
const group = ref<GroupMode>('NONE')
const filtersExpanded = ref(false)
const results = computed(() => sortWines(filterWines(store.summaries.value, filters.value), sort.value))
const groups = computed(() => groupWines(results.value, group.value))
</script>

<template>
  <main class="page page-collection">
    <section class="collection-hero">
      <div><p class="eyebrow">Din privata samling</p><h1>Vinskåpet</h1></div>
      <div class="stats-strip">
        <div><GlassWater :size="18" aria-hidden="true" /><strong>{{ store.bottleCount }}</strong><span>flaskor</span></div>
        <div><LibraryBig :size="18" aria-hidden="true" /><strong>{{ store.inStock.value.length }}</strong><span>olika viner</span></div>
        <div><CircleDollarSign :size="18" aria-hidden="true" /><strong>{{ formatCurrency(store.collectionValue.value, 'SEK') }}</strong><span>inköpsvärde</span></div>
      </div>
    </section>

    <CollectionControls v-model:filters="filters" v-model:sort="sort" v-model:group="group" v-model:expanded="filtersExpanded" :wines="store.summaries.value" />
    <div class="result-heading"><h2>{{ results.length }} {{ results.length === 1 ? 'vin' : 'viner' }}</h2></div>
    <div v-if="results.length" class="wine-groups">
      <section v-for="[title, wines] in groups" :key="title" class="wine-group">
        <div v-if="group !== 'NONE'" class="group-heading"><h2>{{ title }}</h2><span>{{ wines.reduce((sum, wine) => sum + wine.quantity, 0) }} flaskor</span></div>
        <div class="wine-grid"><WineCard v-for="wine in wines" :key="wine.id" :wine="wine" /></div>
      </section>
    </div>
    <div v-else-if="store.summaries.value.length === 0" class="empty-state"><LibraryBig :size="30" aria-hidden="true" /><h2>Din samling är tom</h2><p>Lägg till ditt första vin för att komma igång.</p><RouterLink class="button button-primary" to="/wine/new">Lägg till vin</RouterLink></div>
    <div v-else class="empty-state"><Search :size="30" aria-hidden="true" /><h2>Inga viner hittades</h2><p>Justera sökningen eller återställ filtren.</p></div>
  </main>
</template>
