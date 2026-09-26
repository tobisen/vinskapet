<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import BottomNav from '@/components/BottomNav.vue'
import { useAuth } from '@/composables/useAuth'
import { useWineStore } from '@/composables/useWineStore'

const auth = useAuth()
const store = useWineStore()
const route = useRoute()

watch(() => auth.user.value, async (user) => {
  if (user) await store.loadData()
  else store.clearData()
}, { immediate: true })
</script>

<template>
  <div class="app-shell">
    <div v-if="auth.loading.value" class="app-state" role="status">
      <span class="brand-mark" aria-hidden="true">V</span>
      <p>Öppnar Vinskåpet…</p>
    </div>
    <template v-else>
      <AppHeader v-if="auth.user.value && !route.meta.immersive" />
      <main v-if="auth.user.value && store.loading.value" class="app-state" role="status">
        <span class="loading-spinner" aria-hidden="true" />
        <p>Hämtar din samling…</p>
      </main>
      <main v-else-if="auth.user.value && store.loadError.value" class="app-state app-state--error">
        <h1>Kunde inte ladda</h1>
        <p>{{ store.loadError.value }}</p>
        <button class="button button-primary" type="button" @click="store.loadData(true)">Försök igen</button>
      </main>
      <RouterView v-else />
      <BottomNav v-if="auth.user.value && !route.meta.immersive" />
    </template>
    <Transition name="toast"><div v-if="store.notice.value" class="toast" role="status">{{ store.notice.value }}</div></Transition>
    <Transition name="toast"><div v-if="store.operationError.value" class="toast toast--error" role="alert">{{ store.operationError.value }}</div></Transition>
  </div>
</template>
