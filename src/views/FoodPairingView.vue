<script setup lang="ts">
import { ref } from 'vue'
import { ArrowLeft, Search, Utensils } from '@lucide/vue'
import FoodWineRecommendationCard from '@/components/FoodWineRecommendationCard.vue'
import { useWineStore } from '@/composables/useWineStore'
import {
  foodCategories,
  foodCategoryLabels,
  WineFoodMatcher,
  type FoodCategory,
  type FoodMatchResult,
} from '@/domain/foodMatching'

const store = useWineStore()
const matcher = new WineFoodMatcher()
const query = ref('')
const selectedCategories = ref<FoodCategory[]>([])
const result = ref<FoodMatchResult>()

function toggleCategory(category: FoodCategory): void {
  selectedCategories.value = selectedCategories.value.includes(category)
    ? selectedCategories.value.filter((item) => item !== category)
    : [...selectedCategories.value, category]
}

function search(): void {
  if (!query.value.trim() && !selectedCategories.value.length) return
  result.value = matcher.match(store.inStock.value, {
    text: query.value,
    categories: selectedCategories.value,
  })
}
</script>

<template>
  <main class="page food-pairing-page">
    <RouterLink class="back-link" to="/"><ArrowLeft :size="19" aria-hidden="true" /> Start</RouterLink>
    <header class="page-title">
      <p class="eyebrow">Ur din samling</p>
      <h1>Vin till mat</h1>
      <p>Beskriv maten eller välj en eller flera kategorier.</p>
    </header>

    <form class="food-query" @submit.prevent="search">
      <label class="search-field search-field--large">
        <Utensils :size="20" aria-hidden="true" />
        <span class="sr-only">Vad ska du äta?</span>
        <input v-model="query" placeholder="Till exempel grillad entrecôte med bearnaise" autocomplete="off" />
      </label>
      <fieldset class="food-categories">
        <legend>Snabbval</legend>
        <div>
          <button
            v-for="category in foodCategories"
            :key="category"
            type="button"
            :class="{ selected: selectedCategories.includes(category) }"
            :aria-pressed="selectedCategories.includes(category)"
            @click="toggleCategory(category)"
          >
            {{ foodCategoryLabels[category] }}
          </button>
        </div>
      </fieldset>
      <button
        class="button button-primary"
        type="submit"
        :disabled="!query.trim() && !selectedCategories.length"
      >
        <Search :size="18" aria-hidden="true" /> Hitta vin
      </button>
    </form>

    <section v-if="result" class="food-results" aria-live="polite">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Förslag ur Vinskåpet</p>
          <h2>{{ result.recommendations.length ? 'Bästa valen' : 'Ingen bra match' }}</h2>
        </div>
        <span v-if="result.recommendations.length">{{ result.recommendations.length }} viner</span>
      </div>
      <div v-if="result.recommendations.length" class="food-wine-results">
        <FoodWineRecommendationCard
          v-for="recommendation in result.recommendations"
          :key="recommendation.wine.id"
          :recommendation="recommendation"
        />
      </div>
      <div v-else class="food-no-match">
        <h3>Du har inget riktigt bra vin till den här maten i samlingen.</h3>
        <p>{{ result.suggestedStyle }}</p>
      </div>
    </section>
  </main>
</template>
