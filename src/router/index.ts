import { createRouter, createWebHistory } from 'vue-router'
import CellarView from '@/views/CellarView.vue'
import CollectionView from '@/views/CollectionView.vue'
import HistoryView from '@/views/HistoryView.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import WineDetailView from '@/views/WineDetailView.vue'
import WineFormView from '@/views/WineFormView.vue'
import WishlistView from '@/views/WishlistView.vue'
import { initializeAuth, useAuth } from '@/composables/useAuth'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/', component: HomeView, meta: { requiresAuth: true } },
    { path: '/collection', component: CollectionView, meta: { requiresAuth: true } },
    { path: '/cellar', component: CellarView, meta: { requiresAuth: true } },
    { path: '/wishlist', component: WishlistView, meta: { requiresAuth: true } },
    { path: '/history', component: HistoryView, meta: { requiresAuth: true } },
    { path: '/wine/new', component: WineFormView, meta: { requiresAuth: true } },
    { path: '/wine/:id', component: WineDetailView, meta: { requiresAuth: true } },
    { path: '/wine/:id/edit', component: WineFormView, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  await initializeAuth()
  const auth = useAuth()
  if (to.meta.requiresAuth && !auth.user.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.user.value) return '/'
  return true
})
