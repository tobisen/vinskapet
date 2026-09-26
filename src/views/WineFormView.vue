<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowLeft, Check } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import InventoryForm from '@/components/InventoryForm.vue'
import { useWineStore } from '@/composables/useWineStore'
import type { InventoryInput, Wine, WineStatus, WineType } from '@/types/domain'
import { createId } from '@/utils/id'

const route = useRoute()
const router = useRouter()
const store = useWineStore()
const existing = computed(() => route.params.id ? store.getWine(String(route.params.id)) : undefined)
const isEdit = computed(() => Boolean(route.params.id))
const step = ref(1)
const status = ref<WineStatus>(existing.value?.status ?? 'COLLECTION')
const now = new Date().toISOString()
const form = reactive({
  producer: existing.value?.producer ?? '', name: existing.value?.name ?? '', vintage: existing.value?.vintage,
  wineType: existing.value?.wineType ?? 'RED' as WineType, country: existing.value?.country ?? '', region: existing.value?.region ?? '',
  appellation: existing.value?.appellation ?? '', grapes: existing.value?.grapes.join(', ') ?? '', referencePrice: existing.value?.referencePrice,
  drinkingWindowStart: existing.value?.drinkingWindowStart, drinkingWindowEnd: existing.value?.drinkingWindowEnd,
  optimalDrinkingStart: existing.value?.optimalDrinkingStart, optimalDrinkingEnd: existing.value?.optimalDrinkingEnd,
  description: existing.value?.description ?? '', notes: existing.value?.notes ?? '',
})

function buildWine(): Wine {
  return {
    id: existing.value?.id ?? createId('wine'), producer: form.producer.trim(), name: form.name.trim(), vintage: form.vintage,
    wineType: form.wineType, country: form.country.trim() || undefined, region: form.region.trim() || undefined,
    appellation: form.appellation.trim() || undefined, grapes: form.grapes.split(',').map((item) => item.trim()).filter(Boolean),
    referencePrice: form.referencePrice, currency: 'SEK', storagePotential: existing.value?.storagePotential,
    drinkingWindowStart: form.drinkingWindowStart, drinkingWindowEnd: form.drinkingWindowEnd,
    optimalDrinkingStart: form.optimalDrinkingStart, optimalDrinkingEnd: form.optimalDrinkingEnd,
    foodPairings: existing.value?.foodPairings ?? [], description: form.description.trim() || undefined, notes: form.notes.trim() || undefined,
    status: status.value, createdAt: existing.value?.createdAt ?? now, updatedAt: now,
  }
}

function saveEdit(): void {
  const wine = buildWine()
  store.updateWine(wine)
  void router.push(`/wine/${wine.id}`)
}

function saveNew(inventory?: InventoryInput): void {
  const wine = buildWine()
  store.createWine(wine, status.value === 'COLLECTION' ? inventory : undefined)
  void router.push(status.value === 'WISHLIST' ? '/wishlist' : `/wine/${wine.id}`)
}
</script>

<template>
  <main class="form-page">
    <header class="form-page__header"><button class="back-link" type="button" @click="router.back()"><ArrowLeft :size="19" aria-hidden="true" /> Tillbaka</button><span v-if="!isEdit">Steg {{ step }} av 2</span></header>
    <div class="form-page__content">
      <div><p class="eyebrow">{{ isEdit ? 'Uppdatera information' : 'Ny registrering' }}</p><h1>{{ isEdit ? 'Redigera vin' : 'Lägg till vin' }}</h1><p>{{ step === 1 || isEdit ? 'Grunduppgifter räcker. Resten kan kompletteras senare.' : 'Hur många flaskor köpte du?' }}</p></div>
      <form v-if="step === 1 || isEdit" class="form-stack wine-form" @submit.prevent="isEdit ? saveEdit() : (status === 'WISHLIST' ? saveNew() : step = 2)">
        <div v-if="!isEdit" class="segmented form-mode"><button type="button" :class="{ selected: status === 'COLLECTION' }" @click="status = 'COLLECTION'">Till samlingen</button><button type="button" :class="{ selected: status === 'WISHLIST' }" @click="status = 'WISHLIST'">Till önskelistan</button></div>
        <label class="field"><span>Producent *</span><input v-model="form.producer" required autocomplete="organization" placeholder="Exempel: Prunotto" /></label>
        <label class="field"><span>Vinets namn *</span><input v-model="form.name" required placeholder="Exempel: Barbaresco" /></label>
        <div class="field-row"><label class="field"><span>Årgång</span><input v-model.number="form.vintage" type="number" min="1900" max="2100" inputmode="numeric" placeholder="2023" /></label><label class="field"><span>Vintyp *</span><select v-model="form.wineType" required><option value="RED">Rött</option><option value="WHITE">Vitt</option><option value="ROSE">Rosé</option><option value="SPARKLING_WHITE">Mousserande</option><option value="SPARKLING_ROSE">Mousserande rosé</option><option value="ORANGE">Orange</option><option value="DESSERT">Dessertvin</option><option value="FORTIFIED">Starkvin</option></select></label></div>
        <div class="field-row"><label class="field"><span>Land</span><input v-model="form.country" placeholder="Italien" /></label><label class="field"><span>Region</span><input v-model="form.region" placeholder="Piemonte" /></label></div>
        <label class="field"><span>Appellation</span><input v-model="form.appellation" /></label>
        <label class="field"><span>Druvor</span><input v-model="form.grapes" placeholder="Nebbiolo, Barbera" /><small>Separera flera druvor med komma.</small></label>
        <div class="field-row"><label class="field"><span>Drick från</span><input v-model.number="form.drinkingWindowStart" type="number" min="2000" max="2200" /></label><label class="field"><span>Drick senast</span><input v-model.number="form.drinkingWindowEnd" type="number" min="2000" max="2200" /></label></div>
        <div class="field-row"><label class="field"><span>Optimalt från</span><input v-model.number="form.optimalDrinkingStart" type="number" min="2000" max="2200" /></label><label class="field"><span>Optimalt till</span><input v-model.number="form.optimalDrinkingEnd" type="number" min="2000" max="2200" /></label></div>
        <label class="field"><span>Referenspris</span><div class="input-suffix"><input v-model.number="form.referencePrice" type="number" min="0" /><span>kr</span></div></label>
        <label class="field"><span>Beskrivning</span><textarea v-model="form.description" rows="3" /></label>
        <label class="field"><span>Egna anteckningar</span><textarea v-model="form.notes" rows="2" /></label>
        <button class="button button-primary button-block" type="submit"><Check v-if="isEdit || status === 'WISHLIST'" :size="19" aria-hidden="true" />{{ isEdit ? 'Spara ändringar' : status === 'WISHLIST' ? 'Spara på önskelistan' : 'Fortsätt till inköp' }}</button>
      </form>
      <InventoryForm v-else submit-label="Spara vin och flaskor" @submit="saveNew" />
    </div>
  </main>
</template>
