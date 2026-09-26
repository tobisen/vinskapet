<script setup lang="ts">
import { Clock3, GlassWater, LibraryBig, Sparkles } from '@lucide/vue'

const items = [
  { to: '/collection', label: 'Samling', icon: LibraryBig },
  { to: '/cellar', label: 'Källare', icon: GlassWater },
  { to: '/wishlist', label: 'Önskelista', icon: Sparkles },
  { to: '/history', label: 'Historik', icon: Clock3 },
]
</script>

<template>
  <nav class="bottom-nav" aria-label="Huvudnavigation">
    <RouterLink v-for="item in items" :key="item.to" :to="item.to">
      <component :is="item.icon" :size="21" aria-hidden="true" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
