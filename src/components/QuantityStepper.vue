<script setup lang="ts">
import { Minus, Plus } from '@lucide/vue'

const props = withDefaults(defineProps<{
  modelValue: number
  label?: string
  disabled?: boolean
}>(), {
  label: 'Antal',
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function change(delta: number): void {
  if (props.disabled) return
  emit('update:modelValue', Math.max(1, props.modelValue + delta))
}
</script>

<template>
  <fieldset class="choice-field wishlist-quantity">
    <legend>{{ label }}</legend>
    <div class="quantity-stepper">
      <button type="button" :disabled="disabled || modelValue <= 1" aria-label="Minska önskat antal" @click="change(-1)">
        <Minus :size="18" aria-hidden="true" />
      </button>
      <output :aria-label="`${modelValue} önskade flaskor`">{{ modelValue }}</output>
      <button type="button" :disabled="disabled" aria-label="Öka önskat antal" @click="change(1)">
        <Plus :size="18" aria-hidden="true" />
      </button>
    </div>
  </fieldset>
</template>
