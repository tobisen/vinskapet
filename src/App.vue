<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import BottomNav from '@/components/BottomNav.vue'
import { useWineStore } from '@/composables/useWineStore'

const store = useWineStore()
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <RouterView />
    <BottomNav />
    <Transition name="toast"><div v-if="store.notice.value" class="toast" role="status">{{ store.notice.value }}</div></Transition>
  </div>
</template>
