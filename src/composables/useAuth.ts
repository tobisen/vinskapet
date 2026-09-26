import { readonly, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import { logDevelopmentError } from '@/utils/log'

const session = ref<Session | null>(null)
const user = ref<User | null>(null)
const loading = ref(true)
const error = ref('')
let initialized: Promise<void> | undefined

export function initializeAuth(): Promise<void> {
  if (initialized) return initialized
  initialized = (async () => {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) logDevelopmentError('Could not restore Supabase session', sessionError)
    session.value = data.session
    user.value = data.session?.user ?? null

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      session.value = nextSession
      user.value = nextSession?.user ?? null
    })
    loading.value = false
  })()
  return initialized
}

async function login(email: string, password: string): Promise<boolean> {
  error.value = ''
  loading.value = true
  const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
  loading.value = false
  if (loginError || !data.session) {
    logDevelopmentError('Supabase login failed', loginError)
    error.value = 'Fel e-postadress eller lösenord.'
    return false
  }
  session.value = data.session
  user.value = data.user
  return true
}

async function logout(): Promise<boolean> {
  error.value = ''
  const { error: logoutError } = await supabase.auth.signOut()
  if (logoutError) {
    logDevelopmentError('Supabase logout failed', logoutError)
    error.value = 'Kunde inte logga ut. Försök igen.'
    return false
  }
  session.value = null
  user.value = null
  return true
}

export function useAuth() {
  return { session: readonly(session), user: readonly(user), loading: readonly(loading), error: readonly(error), initializeAuth, login, logout }
}
