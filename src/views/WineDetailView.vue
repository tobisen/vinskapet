<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, Edit3, MinusCircle, Plus, Star, Wine as WineIcon } from '@lucide/vue'
import { useRoute } from 'vue-router'
import ConsumeForm from '@/components/ConsumeForm.vue'
import DrinkingStatusBadge from '@/components/DrinkingStatusBadge.vue'
import InventoryForm from '@/components/InventoryForm.vue'
import ModalShell from '@/components/ModalShell.vue'
import WineTypeBadge from '@/components/WineTypeBadge.vue'
import { useWineStore } from '@/composables/useWineStore'
import type { ConsumeInput, InventoryInput } from '@/types/domain'
import { formatCurrency, formatDate } from '@/utils/format'
import { calculateAverageRating, getStorageRecommendation, storageLocationLabels } from '@/utils/wine'

const route = useRoute()
const store = useWineStore()
const wine = computed(() => store.getWine(String(route.params.id)))
const inventory = computed(() => wine.value ? store.getInventory(wine.value.id) : [])
const tastings = computed(() => wine.value ? [...store.getTastings(wine.value.id)].sort((a, b) => b.date.localeCompare(a.date)) : [])
const averageRating = computed(() => calculateAverageRating(tastings.value))
const latestBuyAgain = computed(() => tastings.value.find((item) => item.buyAgain)?.buyAgain)
const modal = ref<'consume' | 'add' | 'correct'>()
const correctedQuantity = ref(0)
const buyLabels = { YES: 'Ja', MAYBE: 'Kanske', NO: 'Nej' }

async function add(input: InventoryInput): Promise<void> {
  if (!wine.value) return
  if (await store.addInventory(wine.value.id, input)) modal.value = undefined
}

async function consume(input: ConsumeInput): Promise<void> {
  if (!wine.value) return
  if (await store.consumeBottle(wine.value.id, input)) modal.value = undefined
}

function openCorrection(): void {
  correctedQuantity.value = wine.value?.quantity ?? 0
  modal.value = 'correct'
}

async function correct(): Promise<void> {
  if (!wine.value) return
  if (await store.correctInventory(wine.value.id, inventory.value, correctedQuantity.value)) modal.value = undefined
}
</script>

<template>
  <main v-if="wine" class="detail-page">
    <div class="detail-topbar"><RouterLink class="back-link" to="/collection"><ArrowLeft :size="19" aria-hidden="true" /> Samling</RouterLink><RouterLink class="icon-button" :to="`/wine/${wine.id}/edit`" aria-label="Redigera vin" title="Redigera"><Edit3 :size="19" aria-hidden="true" /></RouterLink></div>
    <header class="wine-detail-header">
      <div class="wine-visual" :class="`wine-visual--${wine.wineType.toLowerCase()}`" aria-hidden="true"><div class="bottle-shape"><span>V</span></div></div>
      <div class="wine-detail-intro"><WineTypeBadge :type="wine.wineType" /><p class="eyebrow">{{ wine.producer }}</p><h1>{{ wine.name }} <span v-if="wine.vintage">{{ wine.vintage }}</span></h1><p>{{ [wine.appellation, wine.region, wine.country].filter(Boolean).join(' · ') }}</p><div class="detail-status"><DrinkingStatusBadge :wine="wine" /><strong>{{ wine.quantity }} {{ wine.quantity === 1 ? 'flaska' : 'flaskor' }}</strong></div></div>
    </header>

    <div class="sticky-actions"><button class="button button-primary" type="button" :disabled="wine.quantity === 0" @click="modal = 'consume'"><WineIcon :size="19" aria-hidden="true" /> Drick en</button><button class="button button-secondary" type="button" @click="modal = 'add'"><Plus :size="19" aria-hidden="true" /> Lägg till flaska</button></div>

    <div class="detail-content">
      <section class="detail-section"><h2>Drick & lagra</h2><div class="detail-grid"><div><span>Drickfönster</span><strong>{{ wine.drinkingWindowStart ?? 'Okänt' }}–{{ wine.drinkingWindowEnd ?? 'okänt' }}</strong></div><div><span>Optimal period</span><strong>{{ wine.optimalDrinkingStart ?? 'Okänt' }}–{{ wine.optimalDrinkingEnd ?? 'okänt' }}</strong></div><div><span>Rekommendation</span><strong>{{ getStorageRecommendation(wine) }}</strong></div><div><span>Servering</span><strong>{{ wine.servingTemperatureMin ? `${wine.servingTemperatureMin}–${wine.servingTemperatureMax} °C` : 'Ej angivet' }}</strong></div></div></section>
      <section class="detail-section"><h2>Om vinet</h2><p v-if="wine.description" class="lead-copy">{{ wine.description }}</p><dl class="spec-list"><div><dt>Druvor</dt><dd>{{ wine.grapes.join(', ') || 'Ej angivet' }}</dd></div><div><dt>Region</dt><dd>{{ [wine.region, wine.country].filter(Boolean).join(', ') || 'Ej angivet' }}</dd></div><div><dt>Mat</dt><dd>{{ wine.foodPairings.join(', ') || 'Ej angivet' }}</dd></div><div><dt>Referenspris</dt><dd>{{ formatCurrency(wine.referencePrice, wine.currency) }}</dd></div></dl></section>
      <section class="detail-section"><div class="section-heading"><h2>Mina flaskor</h2><button class="text-button" type="button" @click="openCorrection"><MinusCircle :size="16" aria-hidden="true" /> Korrigera antal</button></div><div v-if="inventory.length" class="purchase-list"><div v-for="item in inventory" :key="item.id"><div><strong>{{ item.quantity }} st · {{ storageLocationLabels[item.storageLocation] }}</strong><span>{{ item.purchaseDate ? formatDate(item.purchaseDate) : 'Datum saknas' }}<template v-if="item.purchaseLocation"> · {{ item.purchaseLocation }}</template></span></div><strong>{{ formatCurrency(item.purchasePrice, item.currency) }}/st</strong></div></div><p v-else>Inga flaskor i lager.</p></section>
      <section class="detail-section"><div class="section-heading"><h2>Smaknoteringar</h2><div v-if="averageRating" class="rating"><Star :size="17" fill="currentColor" aria-hidden="true" /> {{ averageRating.toFixed(1) }}/5</div></div><p v-if="latestBuyAgain" class="buy-again">Köp igen: <strong>{{ buyLabels[latestBuyAgain] }}</strong></p><div v-if="tastings.length" class="tasting-list"><article v-for="tasting in tastings" :key="tasting.id"><div><strong>{{ formatDate(tasting.date) }}</strong><span v-if="tasting.rating" class="rating"><Star :size="14" fill="currentColor" aria-hidden="true" /> {{ tasting.rating }}/5</span></div><p v-if="tasting.review">“{{ tasting.review }}”</p></article></div><p v-else>Inga smaknoteringar ännu.</p></section>
    </div>

    <ModalShell v-if="modal === 'consume'" title="Drick en flaska" @close="modal = undefined"><ConsumeForm :saving="store.isSaving.value" @submit="consume" /></ModalShell>
    <ModalShell v-if="modal === 'add'" title="Lägg till flaskor" @close="modal = undefined"><InventoryForm :saving="store.isSaving.value" @submit="add" /></ModalShell>
    <ModalShell v-if="modal === 'correct'" title="Korrigera antal" @close="modal = undefined"><form class="form-stack" @submit.prevent="correct"><label class="field"><span>Totalt antal flaskor</span><input v-model.number="correctedQuantity" type="number" min="0" required inputmode="numeric" /></label><p class="form-hint">Detta skapar ingen smaknotering.</p><button class="button button-primary button-block" type="submit" :disabled="store.isSaving.value">{{ store.isSaving.value ? 'Sparar…' : 'Spara antal' }}</button></form></ModalShell>
  </main>
  <main v-else class="page"><div class="empty-state"><h1>Vinet hittades inte</h1><RouterLink class="button button-primary" to="/collection">Till samlingen</RouterLink></div></main>
</template>
