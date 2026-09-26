<script setup lang="ts">
import { Plus } from '@lucide/vue'
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="brand" aria-label="Vinskåpet, startsida">
      <span class="brand-mark" aria-hidden="true">V</span>
      <span>Vinskåpet</span>
    </RouterLink>
    <RouterLink class="button button-primary button-compact" to="/wine/new">
      <Plus :size="18" aria-hidden="true" /> Lägg till
    </RouterLink>
  </header>
</template>
