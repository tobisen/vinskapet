<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowLeft, Check } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import InventoryForm from '@/components/InventoryForm.vue'
import { useWineStore } from '@/composables/useWineStore'
import { findDuplicateWine, saveWinePurchase } from '@/search/duplicates'
import type { InventoryInput, Wine, WineStatus, WineType } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const store = useWineStore()
const existing = computed(() => route.params.id ? store.getWine(String(route.params.id)) : undefined)
const isEdit = computed(() => Boolean(route.params.id))
const step = ref(1)
const duplicate = ref<Wine>()
const status = ref<WineStatus>(existing.value?.status ?? 'COLLECTION')
const now = new Date().toISOString()
const form = reactive({
  producer: existing.value?.producer ?? '', name: existing.value?.name ?? (typeof route.query.name === 'string' ? route.query.name : ''), vintage: existing.value?.vintage,
  wineType: existing.value?.wineType ?? 'RED' as WineType, country: existing.value?.country ?? '', region: existing.value?.region ?? '',
  appellation: existing.value?.appellation ?? '', grapes: existing.value?.grapes.join(', ') ?? '', referencePrice: existing.value?.referencePrice,
  image: existing.value?.image ?? '',
  storagePotential: existing.value?.storagePotential, servingTemperatureMin: existing.value?.servingTemperatureMin,
  servingTemperatureMax: existing.value?.servingTemperatureMax, foodPairings: existing.value?.foodPairings.join(', ') ?? '',
  drinkingWindowStart: existing.value?.drinkingWindowStart, drinkingWindowEnd: existing.value?.drinkingWindowEnd,
  optimalDrinkingStart: existing.value?.optimalDrinkingStart, optimalDrinkingEnd: existing.value?.optimalDrinkingEnd,
  description: existing.value?.description ?? '', notes: existing.value?.notes ?? '',
})

function buildWine(): Wine {
  return {
    id: existing.value?.id ?? crypto.randomUUID(), producer: form.producer.trim(), name: form.name.trim(), vintage: form.vintage,
    wineType: form.wineType, country: form.country.trim() || undefined, region: form.region.trim() || undefined,
    appellation: form.appellation.trim() || undefined, grapes: form.grapes.split(',').map((item) => item.trim()).filter(Boolean),
    alcoholPercentage: existing.value?.alcoholPercentage, image: form.image.trim() || undefined,
    systembolagetProductNumber: existing.value?.systembolagetProductNumber, systembolagetUrl: existing.value?.systembolagetUrl,
    referencePrice: form.referencePrice, currency: existing.value?.currency ?? 'SEK', storagePotential: form.storagePotential,
    drinkingWindowStart: form.drinkingWindowStart, drinkingWindowEnd: form.drinkingWindowEnd,
    optimalDrinkingStart: form.optimalDrinkingStart, optimalDrinkingEnd: form.optimalDrinkingEnd,
    servingTemperatureMin: form.servingTemperatureMin, servingTemperatureMax: form.servingTemperatureMax,
    foodPairings: form.foodPairings.split(',').map((item) => item.trim()).filter(Boolean),
    description: form.description.trim() || undefined, notes: form.notes.trim() || undefined,
    assessmentSource: existing.value?.assessmentSource, assessmentUpdatedAt: existing.value?.assessmentUpdatedAt,
    status: status.value, createdAt: existing.value?.createdAt ?? now, updatedAt: now,
  }
}

async function saveEdit(): Promise<void> {
  const wine = buildWine()
  if (await store.updateWine(wine)) await router.push(`/wine/${wine.id}`)
}

async function saveNew(inventory?: InventoryInput): Promise<void> {
  const wine = buildWine()
  if (status.value === 'COLLECTION' && inventory) {
    const result = await saveWinePurchase(wine, inventory, duplicate.value, {
      createWine: store.createWine,
      addInventory: store.addInventory,
    })
    if (result.saved) await router.push(`/wine/${result.wineId}`)
    return
  }
  if (await store.createWine(wine)) await router.push('/wishlist')
}

function continueNew(): void {
  duplicate.value = findDuplicateWine({
    source: 'MANUAL', producer: form.producer, name: form.name, vintage: form.vintage,
  }, store.summaries.value)
  step.value = 2
}
</script>

<template>
  <main class="form-page">
    <header class="form-page__header"><button class="back-link" type="button" @click="router.back()"><ArrowLeft :size="19" aria-hidden="true" /> Tillbaka</button><span v-if="!isEdit">Steg {{ step }} av 2</span></header>
    <div class="form-page__content">
      <div><p class="eyebrow">{{ isEdit ? 'Uppdatera information' : duplicate ? 'Finns i samlingen' : 'Ny registrering' }}</p><h1>{{ isEdit ? 'Redigera vin' : duplicate ? `${duplicate.name} ${duplicate.vintage ?? ''}` : 'Lägg till vin' }}</h1><p>{{ step === 1 || isEdit ? 'Grunduppgifter räcker. Resten kan kompletteras senare.' : duplicate ? 'Vinet finns redan. Lägg till flaskorna på den befintliga posten.' : 'Hur många flaskor köpte du?' }}</p></div>
      <form v-if="step === 1 || isEdit" class="form-stack wine-form" @submit.prevent="isEdit ? saveEdit() : (status === 'WISHLIST' ? saveNew() : continueNew())">
        <div v-if="!isEdit" class="segmented form-mode"><button type="button" :class="{ selected: status === 'COLLECTION' }" @click="status = 'COLLECTION'">Till samlingen</button><button type="button" :class="{ selected: status === 'WISHLIST' }" @click="status = 'WISHLIST'">Till önskelistan</button></div>
        <label class="field"><span>Producent *</span><input v-model="form.producer" required autocomplete="organization" placeholder="Exempel: Prunotto" /></label>
        <label class="field"><span>Vinets namn *</span><input v-model="form.name" required placeholder="Exempel: Barbaresco" /></label>
        <div class="field-row"><label class="field"><span>Årgång</span><input v-model.number="form.vintage" type="number" min="1900" max="2100" inputmode="numeric" placeholder="2023" /></label><label class="field"><span>Vintyp *</span><select v-model="form.wineType" required><option value="RED">Rött</option><option value="WHITE">Vitt</option><option value="ROSE">Rosé</option><option value="SPARKLING_WHITE">Mousserande</option><option value="SPARKLING_ROSE">Mousserande rosé</option><option value="ORANGE">Orange</option><option value="DESSERT">Dessertvin</option><option value="FORTIFIED">Starkvin</option></select></label></div>
        <details class="advanced-fields" :open="isEdit">
          <summary>Redigera detaljer</summary>
          <div class="form-stack">
            <div class="field-row"><label class="field"><span>Land</span><input v-model="form.country" placeholder="Italien" /></label><label class="field"><span>Region</span><input v-model="form.region" placeholder="Piemonte" /></label></div>
            <label class="field"><span>Appellation</span><input v-model="form.appellation" /></label>
            <label class="field"><span>Druvor</span><input v-model="form.grapes" placeholder="Nebbiolo, Barbera" /><small>Separera flera druvor med komma.</small></label>
            <label class="field"><span>Bildadress</span><input v-model="form.image" type="url" inputmode="url" placeholder="https://…" /></label>
            <label class="field"><span>Lagringspotential</span><select v-model="form.storagePotential"><option :value="undefined">Ej angivet</option><option value="LOW">Kort</option><option value="MEDIUM">Medel</option><option value="HIGH">Lång</option></select></label>
            <div class="field-row"><label class="field"><span>Drick från</span><input v-model.number="form.drinkingWindowStart" type="number" min="2000" max="2200" /></label><label class="field"><span>Drick senast</span><input v-model.number="form.drinkingWindowEnd" type="number" min="2000" max="2200" /></label></div>
            <div class="field-row"><label class="field"><span>Optimalt från</span><input v-model.number="form.optimalDrinkingStart" type="number" min="2000" max="2200" /></label><label class="field"><span>Optimalt till</span><input v-model.number="form.optimalDrinkingEnd" type="number" min="2000" max="2200" /></label></div>
            <div class="field-row"><label class="field"><span>Servering min °C</span><input v-model.number="form.servingTemperatureMin" type="number" min="4" max="24" /></label><label class="field"><span>Servering max °C</span><input v-model.number="form.servingTemperatureMax" type="number" min="4" max="24" /></label></div>
            <label class="field"><span>Passar till</span><input v-model="form.foodPairings" placeholder="Nötkött, svamp, lagrad ost" /><small>Separera flera förslag med komma.</small></label>
            <label class="field"><span>Referenspris</span><div class="input-suffix"><input v-model.number="form.referencePrice" type="number" min="0" /><span>kr</span></div></label>
            <label class="field"><span>Beskrivning</span><textarea v-model="form.description" rows="3" /></label>
            <label class="field"><span>Egna anteckningar</span><textarea v-model="form.notes" rows="2" /></label>
          </div>
        </details>
        <button class="button button-primary button-block" type="submit" :disabled="store.isSaving.value"><Check v-if="isEdit || status === 'WISHLIST'" :size="19" aria-hidden="true" />{{ store.isSaving.value ? 'Sparar…' : isEdit ? 'Spara ändringar' : status === 'WISHLIST' ? 'Spara på önskelistan' : 'Fortsätt till inköp' }}</button>
      </form>
      <InventoryForm v-else :submit-label="duplicate ? 'Lägg till flaskor' : 'Lägg till i samlingen'" :saving="store.isSaving.value" @submit="saveNew" />
    </div>
  </main>
</template>
