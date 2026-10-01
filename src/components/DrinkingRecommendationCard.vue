<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import WineImage from '@/components/WineImage.vue'
import type { DrinkClassification, DrinkingRecommendation } from '@/types/domain'

defineProps<{ recommendation: DrinkingRecommendation }>()

const labels: Record<DrinkClassification, string> = {
  DRINK_SOON: 'Drick snart',
  DRINK_NOW: 'Drick nu',
  CAN_DRINK: 'Kan drickas',
  WAIT: 'Vänta',
  UNKNOWN: 'Okänt',
}
</script>

<template>
  <RouterLink class="drink-recommendation" :to="`/wine/${recommendation.wine.id}`">
    <div class="drink-recommendation__image">
      <WineImage
        :src="recommendation.wine.image"
        :wine-type="recommendation.wine.wineType"
        size="md"
        :alt="`${recommendation.wine.producer} ${recommendation.wine.name}`"
      />
    </div>
    <div class="drink-recommendation__content">
      <div class="drink-recommendation__heading">
        <span class="drink-classification" :class="`drink-classification--${recommendation.classification.toLowerCase()}`">
          {{ labels[recommendation.classification] }}
        </span>
        <span>{{ recommendation.wine.quantity }} {{ recommendation.wine.quantity === 1 ? 'flaska' : 'flaskor' }}</span>
      </div>
      <p>{{ recommendation.wine.producer }}</p>
      <h2>{{ recommendation.wine.name }} <span v-if="recommendation.wine.vintage">{{ recommendation.wine.vintage }}</span></h2>
      <dl class="drink-recommendation__periods">
        <div v-if="recommendation.wine.drinkingWindowStart || recommendation.wine.drinkingWindowEnd">
          <dt>Drickfönster</dt>
          <dd>{{ recommendation.wine.drinkingWindowStart ?? 'Nu' }}–{{ recommendation.wine.drinkingWindowEnd ?? 'vidare' }}</dd>
        </div>
        <div v-if="recommendation.wine.optimalDrinkingStart || recommendation.wine.optimalDrinkingEnd">
          <dt>Optimal period</dt>
          <dd>{{ recommendation.wine.optimalDrinkingStart ?? 'Nu' }}–{{ recommendation.wine.optimalDrinkingEnd ?? 'vidare' }}</dd>
        </div>
      </dl>
      <strong class="drink-recommendation__reason">{{ recommendation.explanation }}</strong>
    </div>
    <ChevronRight :size="19" aria-hidden="true" />
  </RouterLink>
</template>
