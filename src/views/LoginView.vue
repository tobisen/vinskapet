<script setup lang="ts">
import { ref } from 'vue'
import { LogIn } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')

async function submit(): Promise<void> {
  if (!await auth.login(email.value.trim(), password.value)) return
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
    ? route.query.redirect
    : '/'
  await router.replace(redirect)
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="login-brand">
        <span class="brand-mark" aria-hidden="true">V</span>
        <p class="eyebrow">Din privata vinkällare</p>
        <h1>Vinskåpet</h1>
      </div>
      <form class="form-stack" @submit.prevent="submit">
        <label class="field"><span>E-post</span><input v-model="email" type="email" autocomplete="email" inputmode="email" required autofocus /></label>
        <label class="field"><span>Lösenord</span><input v-model="password" type="password" autocomplete="current-password" required /></label>
        <p v-if="auth.error.value" class="form-error" role="alert">{{ auth.error.value }}</p>
        <button class="button button-primary button-block" type="submit" :disabled="auth.loading.value">
          <LogIn :size="19" aria-hidden="true" />{{ auth.loading.value ? 'Loggar in…' : 'Logga in' }}
        </button>
      </form>
    </section>
  </main>
</template>
