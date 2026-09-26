<script setup lang="ts">
import type { Wine } from '@/types/domain'
import { drinkingStatusLabels, getDrinkingStatus } from '@/utils/wine'

const props = defineProps<{ wine: Wine }>()
const status = getDrinkingStatus(props.wine)
</script>

<template>
  <span class="status-badge" :class="`status-${status.toLowerCase()}`">
    {{ drinkingStatusLabels[status] }}
  </span>
</template>
