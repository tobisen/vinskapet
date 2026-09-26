<script setup lang="ts">
import { ref } from 'vue'
import type { InventoryInput, StorageLocation } from '@/types/domain'
import { todayIso } from '@/utils/format'

const props = withDefaults(defineProps<{ submitLabel?: string }>(), { submitLabel: 'Spara flaskor' })
const emit = defineEmits<{ submit: [input: InventoryInput] }>()

const quantity = ref(1)
const purchasePrice = ref<number>()
const purchaseDate = ref(todayIso())
const purchaseLocation = ref('Systembolaget')
const storageLocation = ref<StorageLocation>('WINE_FRIDGE')

function submit(): void {
  emit('submit', {
    quantity: quantity.value,
    purchasePrice: purchasePrice.value,
    purchaseDate: purchaseDate.value || undefined,
    purchaseLocation: purchaseLocation.value.trim() || undefined,
    storageLocation: storageLocation.value,
  })
}
</script>

<template>
  <form class="form-stack" @submit.prevent="submit">
    <div class="field-row">
      <label class="field"><span>Antal</span><input v-model.number="quantity" type="number" min="1" required inputmode="numeric" /></label>
      <label class="field"><span>Pris per flaska</span><div class="input-suffix"><input v-model.number="purchasePrice" type="number" min="0" inputmode="decimal" /><span>kr</span></div></label>
    </div>
    <label class="field"><span>Förvaringsplats</span><select v-model="storageLocation"><option value="WINE_FRIDGE">Vinskåp · 11 °C</option><option value="ROOM_STORAGE">Rumstemperatur</option><option value="OTHER">Övrig förvaring</option></select></label>
    <div class="field-row">
      <label class="field"><span>Inköpsdatum</span><input v-model="purchaseDate" type="date" /></label>
      <label class="field"><span>Inköpsställe</span><input v-model="purchaseLocation" /></label>
    </div>
    <button class="button button-primary button-block" type="submit">{{ props.submitLabel }}</button>
  </form>
</template>
