<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import WineImage from '@/components/WineImage.vue'
import type { FoodMatchTier, FoodWineRecommendation } from '@/domain/foodMatching'

defineProps<{ recommendation: FoodWineRecommendation }>()

const tierLabels: Record<FoodMatchTier, string> = {
  BEST_MATCH: 'Bäst match',
  ALTERNATIVE: 'Bra alternativ',
  SAVE_FOR_LATER: 'Spara hellre',
}
</script>

<template>
  <RouterLink class="food-wine-result" :to="`/wine/${recommendation.wine.id}`">
    <div class="food-wine-result__image">
      <WineImage
        :src="recommendation.wine.image"
        :wine-type="recommendation.wine.wineType"
        size="md"
        :alt="`${recommendation.wine.producer} ${recommendation.wine.name}`"
      />
    </div>
    <div class="food-wine-result__content">
      <div class="food-wine-result__top">
        <span class="food-match-tier" :class="`food-match-tier--${recommendation.tier.toLowerCase()}`">
          {{ tierLabels[recommendation.tier] }}
        </span>
        <span>{{ recommendation.wine.quantity }} {{ recommendation.wine.quantity === 1 ? 'flaska' : 'flaskor' }}</span>
      </div>
      <p>{{ recommendation.wine.producer }}</p>
      <h2>{{ recommendation.wine.name }} <span v-if="recommendation.wine.vintage">{{ recommendation.wine.vintage }}</span></h2>
      <p class="food-wine-result__reason">{{ recommendation.explanation }}</p>
    </div>
    <ChevronRight :size="19" aria-hidden="true" />
  </RouterLink>
</template>
