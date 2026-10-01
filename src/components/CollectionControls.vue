<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, Filter, Search, X } from '@lucide/vue'
import type { DrinkingStatus, GroupMode, SortDirection, StorageLocation, WineFilters, WineSort, WineSummary, WineType } from '@/types/domain'
import { defaultSortDirection, drinkingStatusLabels, storageLocationLabels, wineTypeLabels } from '@/utils/wine'

const props = defineProps<{ filters: WineFilters; sort: WineSort; direction: SortDirection; group: GroupMode; wines: WineSummary[]; expanded: boolean }>()
const emit = defineEmits<{
  'update:filters': [value: WineFilters]
  'update:sort': [value: WineSort]
  'update:direction': [value: SortDirection]
  'update:group': [value: GroupMode]
  'update:expanded': [value: boolean]
}>()

const countries = computed(() => [...new Set(props.wines.flatMap((wine) => wine.country ? [wine.country] : []))].sort())
const regions = computed(() => [...new Set(props.wines.flatMap((wine) => wine.region ? [wine.region] : []))].sort())
const vintages = computed(() => [...new Set(props.wines.flatMap((wine) => wine.vintage ? [wine.vintage] : []))].sort((a, b) => b - a))
const activeCount = computed(() => Object.entries(props.filters).filter(([key, value]) => key !== 'query' && !(key === 'availability' && value === 'IN_STOCK') && value !== 'ALL' && value !== '').length)

function patchFilter<K extends keyof WineFilters>(key: K, value: WineFilters[K]): void {
  emit('update:filters', { ...props.filters, [key]: value })
}

function reset(): void {
  emit('update:filters', { query: '', wineType: 'ALL', country: '', region: '', vintage: 'ALL', drinkingStatus: 'ALL', storageLocation: 'ALL', availability: 'IN_STOCK' })
}


function changeSort(value: WineSort): void {
  emit('update:sort', value)
  emit('update:direction', defaultSortDirection(value))
}
</script>

<template>
  <section class="collection-controls" aria-label="Sök och filtrera">
    <div class="search-row">
      <label class="search-field">
        <Search :size="19" aria-hidden="true" />
        <span class="sr-only">Sök viner</span>
        <input :value="filters.query" type="search" placeholder="Sök producent, vin, druva…" @input="patchFilter('query', ($event.target as HTMLInputElement).value)" />
      </label>
      <button class="filter-button" type="button" :aria-expanded="expanded" @click="$emit('update:expanded', !expanded)">
        <Filter :size="19" aria-hidden="true" /><span>Filter</span><b v-if="activeCount">{{ activeCount }}</b>
      </button>
    </div>
    <div v-if="expanded" class="filter-panel">
      <div class="field-row">
        <label class="field"><span>Vintyp</span><select :value="filters.wineType" @change="patchFilter('wineType', ($event.target as HTMLSelectElement).value as WineType | 'ALL')"><option value="ALL">Alla vintyper</option><option v-for="(label, value) in wineTypeLabels" :key="value" :value="value">{{ label }}</option></select></label>
        <label class="field"><span>Drickstatus</span><select :value="filters.drinkingStatus" @change="patchFilter('drinkingStatus', ($event.target as HTMLSelectElement).value as DrinkingStatus | 'ALL')"><option value="ALL">Alla statusar</option><option v-for="(label, value) in drinkingStatusLabels" :key="value" :value="value">{{ label }}</option></select></label>
      </div>
      <div class="field-row">
        <label class="field"><span>Land</span><select :value="filters.country" @change="patchFilter('country', ($event.target as HTMLSelectElement).value)"><option value="">Alla länder</option><option v-for="country in countries" :key="country">{{ country }}</option></select></label>
        <label class="field"><span>Region</span><select :value="filters.region" @change="patchFilter('region', ($event.target as HTMLSelectElement).value)"><option value="">Alla regioner</option><option v-for="region in regions" :key="region">{{ region }}</option></select></label>
      </div>
      <div class="field-row">
        <label class="field"><span>Årgång</span><select :value="filters.vintage" @change="patchFilter('vintage', ($event.target as HTMLSelectElement).value === 'ALL' ? 'ALL' : Number(($event.target as HTMLSelectElement).value))"><option value="ALL">Alla årgångar</option><option v-for="vintage in vintages" :key="vintage" :value="vintage">{{ vintage }}</option></select></label>
        <label class="field"><span>Förvaring</span><select :value="filters.storageLocation" @change="patchFilter('storageLocation', ($event.target as HTMLSelectElement).value as StorageLocation | 'ALL')"><option value="ALL">Alla platser</option><option v-for="(label, value) in storageLocationLabels" :key="value" :value="value">{{ label }}</option></select></label>
      </div>
      <label class="field"><span>Innehåll</span><select :value="filters.availability" @change="patchFilter('availability', ($event.target as HTMLSelectElement).value as WineFilters['availability'])"><option value="ALL">Alla viner</option><option value="IN_STOCK">Finns i lager</option><option value="DRUNK">Tidigare druckna</option><option value="WISHLIST">Önskelista</option></select></label>
      <button class="text-button" type="button" @click="reset"><X :size="16" aria-hidden="true" /> Återställ filter</button>
    </div>
    <div class="sort-row">
      <div class="sort-control"><label><span>Sortera</span><select :value="sort" @change="changeSort(($event.target as HTMLSelectElement).value as WineSort)"><option value="DRINK_PRIORITY">Drickprioritet</option><option value="NAME">Namn</option><option value="PRODUCER">Producent</option><option value="VINTAGE">Årgång</option><option value="COUNTRY">Land</option><option value="REGION">Region</option><option value="TYPE">Vintyp</option><option value="PRICE">Pris</option><option value="QUANTITY">Antal</option><option value="PURCHASE_DATE">Inköpsdatum</option><option value="WINDOW_START">Drickfönster, start</option><option value="WINDOW_END">Drickfönster, slut</option></select></label><button class="icon-button sort-direction" type="button" :aria-label="direction === 'ASC' ? 'Sortera fallande' : 'Sortera stigande'" :title="direction === 'ASC' ? 'Stigande ordning' : 'Fallande ordning'" @click="$emit('update:direction', direction === 'ASC' ? 'DESC' : 'ASC')"><ArrowUp v-if="direction === 'ASC'" :size="19" aria-hidden="true" /><ArrowDown v-else :size="19" aria-hidden="true" /></button></div>
      <label><span>Gruppera</span><select :value="group" @change="$emit('update:group', ($event.target as HTMLSelectElement).value as GroupMode)"><option value="NONE">Ingen</option><option value="COUNTRY_REGION">Land & region</option><option value="TYPE">Vintyp</option><option value="DRINKING_PERIOD">Drickperiod</option><option value="STORAGE">Förvaring</option></select></label>
    </div>
  </section>
</template>
