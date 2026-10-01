<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, GlassWater } from '@lucide/vue'
import { useRoute } from 'vue-router'
import DrinkingRecommendationCard from '@/components/DrinkingRecommendationCard.vue'
import { useWineStore } from '@/composables/useWineStore'
import { buildDrinkingRecommendations, countDrinkingBottles } from '@/domain/drinking'
import type { DrinkClassification } from '@/types/domain'

const route = useRoute()
const store = useWineStore()
const tabs: { status: DrinkClassification; label: string }[] = [
  { status: 'DRINK_SOON', label: 'Drick snart' },
  { status: 'DRINK_NOW', label: 'Drick nu' },
  { status: 'CAN_DRINK', label: 'Kan drickas' },
  { status: 'WAIT', label: 'Vänta' },
  { status: 'UNKNOWN', label: 'Okänt' },
]
const validStatuses = new Set(tabs.map((tab) => tab.status))
const selectedStatus = computed<DrinkClassification>(() => {
  const value = typeof route.query.status === 'string' ? route.query.status as DrinkClassification : 'DRINK_SOON'
  return validStatuses.has(value) ? value : 'DRINK_SOON'
})
const recommendations = computed(() => buildDrinkingRecommendations(store.inStock.value))
const counts = computed(() => countDrinkingBottles(recommendations.value))
const visibleRecommendations = computed(() =>
  recommendations.value.filter((item) => item.classification === selectedStatus.value),
)
const selectedLabel = computed(() => tabs.find((tab) => tab.status === selectedStatus.value)?.label ?? 'Drick snart')
</script>

<template>
  <main class="page drink-planner-page">
    <RouterLink class="back-link" to="/"><ArrowLeft :size="19" aria-hidden="true" /> Start</RouterLink>
    <header class="page-title">
      <p class="eyebrow">Drickläge</p>
      <h1>Vad ska jag dricka?</h1>
      <p>Vinerna är prioriterade efter drickfönster och optimal period.</p>
    </header>

    <nav class="drink-tabs" aria-label="Filtrera efter drickläge">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.status"
        :to="{ path: '/drink', query: { status: tab.status } }"
        :class="{ selected: selectedStatus === tab.status }"
      >
        <strong>{{ counts[tab.status] }}</strong>
        <span>{{ tab.label }}</span>
      </RouterLink>
    </nav>

    <section class="drink-results">
      <div class="group-heading">
        <h2>{{ selectedLabel }}</h2>
        <span>{{ counts[selectedStatus] }} flaskor</span>
      </div>
      <div v-if="visibleRecommendations.length" class="drink-recommendation-list">
        <DrinkingRecommendationCard
          v-for="recommendation in visibleRecommendations"
          :key="recommendation.wine.id"
          :recommendation="recommendation"
        />
      </div>
      <div v-else class="empty-state drink-empty">
        <GlassWater :size="28" aria-hidden="true" />
        <h2>Inga flaskor här</h2>
        <p>Det finns inga viner med det här drickläget just nu.</p>
      </div>
    </section>
  </main>
</template>
