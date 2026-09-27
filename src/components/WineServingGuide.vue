<script setup lang="ts">
import { computed } from 'vue'
import type { Wine } from '@/types/domain'
import { getDrinkingGuidance } from '@/utils/wine'

const props = defineProps<{ wine: Wine }>()

const yearRange = computed(() => {
  const { optimalDrinkingStart: start, optimalDrinkingEnd: end } = props.wine
  if (start && end) return `${start}–${end}`
  if (start) return `Från ${start}`
  if (end) return `Till ${end}`
  return ''
})

const serving = computed(() => {
  const { servingTemperatureMin: min, servingTemperatureMax: max } = props.wine
  if (min != null && max != null) return `${min}–${max} °C`
  if (min != null) return `${min} °C eller varmare`
  if (max != null) return `Högst ${max} °C`
  return ''
})

const rows = computed(() => [
  { label: 'Optimal period', value: yearRange.value },
  { label: 'Servering', value: serving.value },
  { label: 'Druvor', value: props.wine.grapes.join(', ') },
  { label: 'Passar till', value: props.wine.foodPairings.join(', ') },
].filter((row) => row.value))
const guidance = computed(() => getDrinkingGuidance(props.wine))
</script>

<template>
  <section class="serving-guide" aria-label="Serveringsguide">
    <div v-for="row in rows" :key="row.label"><span>{{ row.label }}</span><strong>{{ row.value }}</strong></div>
    <p v-if="guidance" class="serving-guide__guidance">{{ guidance }}</p>
    <p v-if="!rows.length">Serveringsdetaljer saknas för det här vinet.</p>
  </section>
</template>
