<script setup lang="ts">
import { ChevronRight, MapPin } from '@lucide/vue'
import type { WineSummary } from '@/types/domain'
import { formatCurrency } from '@/utils/format'
import DrinkingStatusBadge from './DrinkingStatusBadge.vue'
import WineImage from './WineImage.vue'
import WineTypeBadge from './WineTypeBadge.vue'

defineProps<{ wine: WineSummary }>()
</script>

<template>
  <RouterLink class="wine-card" :to="`/wine/${wine.id}`">
    <div class="wine-card__top">
      <WineTypeBadge :type="wine.wineType" />
      <span class="wine-card__quantity">{{ wine.quantity }} {{ wine.quantity === 1 ? 'flaska' : 'flaskor' }}</span>
    </div>
    <div class="wine-card__image-row">
      <WineImage :src="wine.image" :wine-type="wine.wineType" size="md" :alt="`${wine.producer} ${wine.name}`" />
      <div class="wine-card__body">
        <div>
          <p class="wine-card__producer">{{ wine.producer }}</p>
          <h3>{{ wine.name }} <span v-if="wine.vintage">{{ wine.vintage }}</span></h3>
        </div>
        <ChevronRight :size="20" aria-hidden="true" />
      </div>
    </div>
    <p class="wine-card__origin">
      {{ [wine.region, wine.country].filter(Boolean).join(' · ') }}
      <span v-if="wine.grapes.length"> · {{ wine.grapes.join(', ') }}</span>
    </p>
    <div class="wine-card__meta">
      <span>{{ formatCurrency(wine.averagePrice, wine.currency) }}/st</span>
      <span v-if="wine.storageLocations.length" class="wine-card__location">
        <MapPin :size="14" aria-hidden="true" />{{ wine.storageLocations.length > 1 ? 'Flera platser' : wine.storageLocations[0] === 'WINE_FRIDGE' ? 'Vinskåp' : 'Övrigt' }}
      </span>
    </div>
    <div class="wine-card__footer">
      <span v-if="wine.drinkingWindowStart || wine.drinkingWindowEnd">
        Drick {{ wine.drinkingWindowStart ?? 'nu' }}–{{ wine.drinkingWindowEnd ?? 'vidare' }}
      </span>
      <span v-else>Drickfönster saknas</span>
      <DrinkingStatusBadge :wine="wine" />
    </div>
  </RouterLink>
</template>
