<script setup lang="ts">
import { X } from '@lucide/vue'

defineProps<{ title: string }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal" role="dialog" aria-modal="true" :aria-label="title">
      <header class="modal__header">
        <h2>{{ title }}</h2>
        <button class="icon-button" type="button" aria-label="Stäng" title="Stäng" @click="$emit('close')">
          <X :size="22" aria-hidden="true" />
        </button>
      </header>
      <div class="modal__body"><slot /></div>
    </section>
  </div>
</template>
