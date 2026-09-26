<script setup lang="ts">
import { ref } from 'vue'
import { Minus, Plus } from '@lucide/vue'
import type { InventoryInput, StorageLocation } from '@/types/domain'
import { todayIso } from '@/utils/format'

const props = withDefaults(defineProps<{
  submitLabel?: string
  saving?: boolean
  initialPrice?: number
  initialLocation?: string
}>(), { submitLabel: 'Spara flaskor', saving: false, initialPrice: undefined, initialLocation: 'Systembolaget' })
const emit = defineEmits<{ submit: [input: InventoryInput] }>()

const quantity = ref(1)
const purchasePrice = ref<number | undefined>(props.initialPrice)
const purchaseDate = ref(todayIso())
const purchaseLocation = ref(props.initialLocation)
const storageLocation = ref<StorageLocation>('WINE_FRIDGE')

function submit(): void {
  if (props.saving) return
  emit('submit', {
    quantity: quantity.value,
    purchasePrice: purchasePrice.value,
    purchaseDate: purchaseDate.value || undefined,
    purchaseLocation: purchaseLocation.value.trim() || undefined,
    storageLocation: storageLocation.value,
  })
}

function changeQuantity(change: number): void {
  quantity.value = Math.max(1, quantity.value + change)
}
</script>

<template>
  <form class="form-stack" @submit.prevent="submit">
    <div class="field-row">
      <fieldset class="choice-field"><legend>Antal</legend><div class="quantity-stepper"><button type="button" aria-label="Minska antal" @click="changeQuantity(-1)"><Minus :size="18" /></button><output>{{ quantity }}</output><button type="button" aria-label="Öka antal" @click="changeQuantity(1)"><Plus :size="18" /></button></div></fieldset>
      <label class="field"><span>Pris per flaska</span><div class="input-suffix"><input v-model.number="purchasePrice" type="number" min="0" inputmode="decimal" /><span>kr</span></div></label>
    </div>
    <label class="field"><span>Förvaringsplats</span><select v-model="storageLocation"><option value="WINE_FRIDGE">Vinskåp · 11 °C</option><option value="ROOM_STORAGE">Rumstemperatur</option><option value="OTHER">Övrig förvaring</option></select></label>
    <div class="field-row">
      <label class="field"><span>Inköpsdatum</span><input v-model="purchaseDate" type="date" /></label>
      <label class="field"><span>Inköpsställe</span><input v-model="purchaseLocation" /></label>
    </div>
    <button class="button button-primary button-block" type="submit" :disabled="props.saving">{{ props.saving ? 'Sparar…' : props.submitLabel }}</button>
  </form>
</template>
