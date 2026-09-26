<script setup lang="ts">
import { LogOut, Plus } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const auth = useAuth()
const router = useRouter()

async function logout(): Promise<void> {
  if (await auth.logout()) await router.push('/login')
}
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="brand" aria-label="Vinskåpet, startsida">
      <span class="brand-mark" aria-hidden="true">V</span>
      <span>Vinskåpet</span>
    </RouterLink>
    <div class="header-actions">
      <RouterLink class="button button-primary button-compact" to="/wine/new">
        <Plus :size="18" aria-hidden="true" /> Lägg till
      </RouterLink>
      <button class="icon-button header-logout" type="button" aria-label="Logga ut" title="Logga ut" @click="logout">
        <LogOut :size="18" aria-hidden="true" />
      </button>
    </div>
  </header>
</template>
