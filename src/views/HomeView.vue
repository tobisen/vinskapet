<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, CircleDollarSign, Clock3, GlassWater, LibraryBig, Plus, Sparkles } from '@lucide/vue'
import WineCard from '@/components/WineCard.vue'
import { useWineStore } from '@/composables/useWineStore'
import { formatCurrency } from '@/utils/format'
import { calculateDrinkingPlan, getDrinkingStatus, sortWines } from '@/utils/wine'

const store = useWineStore()

const statusCounts = computed(() => calculateDrinkingPlan(store.inStock.value))

const drinkNow = computed(() =>
  sortWines(
    store.inStock.value.filter((wine) => ['OPTIMAL', 'DRINK_SOON', 'PAST_WINDOW', 'CAN_DRINK'].includes(getDrinkingStatus(wine))),
    'DRINK_PRIORITY',
  ).slice(0, 3),
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
      <RouterLink to="/cellar"><GlassWater :size="22" aria-hidden="true" /><span><strong>Välj vin för kvällen</strong><small>Se vad som är redo</small></span><ArrowRight :size="18" aria-hidden="true" /></RouterLink>
      <RouterLink to="/wine/new"><Plus :size="22" aria-hidden="true" /><span><strong>Lägg till vin</strong><small>Registrera ett nytt inköp</small></span><ArrowRight :size="18" aria-hidden="true" /></RouterLink>
      <RouterLink to="/collection"><LibraryBig :size="22" aria-hidden="true" /><span><strong>Öppna samlingen</strong><small>Sök, filtrera och sortera</small></span><ArrowRight :size="18" aria-hidden="true" /></RouterLink>
    </section>

    <section class="home-section">
      <div class="section-heading"><div><p class="eyebrow">Drickplan</p><h2>Just nu</h2></div><RouterLink class="text-link" to="/cellar">Öppna källaren <ArrowRight :size="16" aria-hidden="true" /></RouterLink></div>
      <div class="home-status-grid">
        <RouterLink to="/cellar"><span class="status-symbol status-symbol--optimal" aria-hidden="true" /><strong>{{ statusCounts.ready }}</strong><span>kan drickas nu</span></RouterLink>
        <RouterLink to="/cellar"><Clock3 :size="19" aria-hidden="true" /><strong>{{ statusCounts.soon }}</strong><span>drick snart</span></RouterLink>
        <RouterLink to="/cellar"><span class="status-symbol status-symbol--wait" aria-hidden="true" /><strong>{{ statusCounts.waiting }}</strong><span>bör vänta</span></RouterLink>
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
