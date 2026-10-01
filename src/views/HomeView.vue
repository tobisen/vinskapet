<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, CircleDollarSign, Clock3, GlassWater, LibraryBig, Plus, Sparkles } from '@lucide/vue'
import WineCard from '@/components/WineCard.vue'
import { useWineStore } from '@/composables/useWineStore'
import { buildDrinkingRecommendations, countDrinkingBottles } from '@/domain/drinking'
import { formatCurrency } from '@/utils/format'

const store = useWineStore()

const recommendations = computed(() => buildDrinkingRecommendations(store.inStock.value))
const statusCounts = computed(() => countDrinkingBottles(recommendations.value))

const drinkNow = computed(() =>
  recommendations.value
    .filter((item) => ['DRINK_SOON', 'DRINK_NOW', 'CAN_DRINK'].includes(item.classification))
    .slice(0, 3)
    .map((item) => item.wine),
)
</script>

<template>
  <main class="home-page">
    <section class="home-hero">
      <div class="home-hero__intro">
        <p class="eyebrow">Din privata vinkällare</p>
        <h1>Vinskåpet</h1>
        <p>Samlingen är redo. Här är läget just nu.</p>
      </div>
      <div class="home-stats" aria-label="Samlingsöversikt">
        <div><GlassWater :size="20" aria-hidden="true" /><strong>{{ store.bottleCount.value }}</strong><span>flaskor</span></div>
        <div><LibraryBig :size="20" aria-hidden="true" /><strong>{{ store.inStock.value.length }}</strong><span>olika viner</span></div>
        <div><CircleDollarSign :size="20" aria-hidden="true" /><strong>{{ formatCurrency(store.collectionValue.value) }}</strong><span>inköpsvärde</span></div>
      </div>
    </section>

    <section class="home-actions" aria-label="Snabbval">
      <RouterLink to="/drink"><GlassWater :size="22" aria-hidden="true" /><span><strong>Välj vin för kvällen</strong><small>Se vad som är redo</small></span><ArrowRight :size="18" aria-hidden="true" /></RouterLink>
      <RouterLink to="/wine/new"><Plus :size="22" aria-hidden="true" /><span><strong>Lägg till vin</strong><small>Registrera ett nytt inköp</small></span><ArrowRight :size="18" aria-hidden="true" /></RouterLink>
      <RouterLink to="/collection"><LibraryBig :size="22" aria-hidden="true" /><span><strong>Öppna samlingen</strong><small>Sök, filtrera och sortera</small></span><ArrowRight :size="18" aria-hidden="true" /></RouterLink>
    </section>

    <section class="home-section">
      <div class="section-heading"><div><p class="eyebrow">Vad ska jag dricka?</p><h2>Drickläge</h2></div><RouterLink class="text-link" to="/drink">Visa alla <ArrowRight :size="16" aria-hidden="true" /></RouterLink></div>
      <div class="home-status-grid">
        <RouterLink :to="{ path: '/drink', query: { status: 'DRINK_SOON' } }"><Clock3 :size="19" aria-hidden="true" /><strong>{{ statusCounts.DRINK_SOON }}</strong><span>drick snart</span></RouterLink>
        <RouterLink :to="{ path: '/drink', query: { status: 'DRINK_NOW' } }"><span class="status-symbol status-symbol--optimal" aria-hidden="true" /><strong>{{ statusCounts.DRINK_NOW }}</strong><span>drick nu</span></RouterLink>
        <RouterLink :to="{ path: '/drink', query: { status: 'WAIT' } }"><span class="status-symbol status-symbol--wait" aria-hidden="true" /><strong>{{ statusCounts.WAIT }}</strong><span>vänta</span></RouterLink>
      </div>
    </section>

    <section class="home-section">
      <div class="section-heading"><div><p class="eyebrow">Ur samlingen</p><h2>Bra val just nu</h2></div><RouterLink class="text-link" to="/collection">Visa alla <ArrowRight :size="16" aria-hidden="true" /></RouterLink></div>
      <div v-if="drinkNow.length" class="wine-grid"><WineCard v-for="wine in drinkNow" :key="wine.id" :wine="wine" /></div>
      <p v-else class="quiet-empty">Inga viner har ett aktivt drickfönster just nu.</p>
    </section>

    <RouterLink class="wishlist-callout" to="/wishlist">
      <Sparkles :size="22" aria-hidden="true" />
      <span><strong>{{ store.wishlist.value.length }} på önskelistan</strong><small>Se viner du håller utkik efter</small></span>
      <ArrowRight :size="18" aria-hidden="true" />
    </RouterLink>
  </main>
</template>
