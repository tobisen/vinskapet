<script setup lang="ts">
import { computed } from 'vue'
import { Clock3, Snowflake, Wine } from '@lucide/vue'
import WineCard from '@/components/WineCard.vue'
import { useWineStore } from '@/composables/useWineStore'
import { getDrinkingPeriod, getDrinkingStatus, getStorageRecommendation } from '@/utils/wine'

const store = useWineStore()
const periods = ['Drick nu', '2027–2029', '2030–2034', '2035+']
const grouped = computed(() => new Map(periods.map((period) => [period, store.inStock.value.filter((wine) => getDrinkingPeriod(wine) === period)])))
const ready = computed(() => store.inStock.value.filter((wine) => ['CAN_DRINK', 'OPTIMAL', 'DRINK_SOON', 'PAST_WINDOW'].includes(getDrinkingStatus(wine))).reduce((sum, wine) => sum + wine.quantity, 0))
const soon = computed(() => store.inStock.value.filter((wine) => ['DRINK_SOON', 'PAST_WINDOW'].includes(getDrinkingStatus(wine))).reduce((sum, wine) => sum + wine.quantity, 0))
const cellarPriority = computed(() => store.inStock.value.filter((wine) => getStorageRecommendation(wine).includes('vinskåp')).reduce((sum, wine) => sum + wine.quantity, 0))
</script>

<template>
  <main class="page">
    <header class="page-title"><p class="eyebrow">Drickplanering</p><h1>Källare</h1><p>En snabb blick på vad som är moget och vad som mår bäst av mer tid.</p></header>
    <section class="metric-grid" aria-label="Källarstatistik">
      <div><Wine :size="20" aria-hidden="true" /><strong>{{ ready }}</strong><span>redo att dricka</span></div>
      <div><Clock3 :size="20" aria-hidden="true" /><strong>{{ soon }}</strong><span>bör drickas snart</span></div>
      <div><Snowflake :size="20" aria-hidden="true" /><strong>{{ cellarPriority }}</strong><span>prioritera i skåpet</span></div>
    </section>
    <section v-for="[period, wines] in grouped" :key="period" class="planning-section">
      <div class="group-heading"><h2>{{ period }}</h2><span>{{ wines.reduce((sum, wine) => sum + wine.quantity, 0) }} flaskor</span></div>
      <div v-if="wines.length" class="wine-grid"><WineCard v-for="wine in wines" :key="wine.id" :wine="wine" /></div>
      <p v-else class="quiet-empty">Inga flaskor i den här perioden.</p>
    </section>
  </main>
</template>
