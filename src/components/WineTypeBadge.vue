<script setup lang="ts">
import type { WineType } from '@/types/domain'
import { wineTypeLabels } from '@/utils/wine'

defineProps<{ type: WineType }>()
</script>

<template>
  <span class="type-badge" :class="`type-${type.toLowerCase()}`">
    <span class="type-dot" aria-hidden="true" />{{ wineTypeLabels[type] }}
  </span>
</template>
