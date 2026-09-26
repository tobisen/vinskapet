import { createRouter, createWebHistory } from 'vue-router'
import CellarView from '@/views/CellarView.vue'
import CollectionView from '@/views/CollectionView.vue'
import HistoryView from '@/views/HistoryView.vue'
import HomeView from '@/views/HomeView.vue'
import WineDetailView from '@/views/WineDetailView.vue'
import WineFormView from '@/views/WineFormView.vue'
import WishlistView from '@/views/WishlistView.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: HomeView },
    { path: '/collection', component: CollectionView },
    { path: '/cellar', component: CellarView },
    { path: '/wishlist', component: WishlistView },
    { path: '/history', component: HistoryView },
    { path: '/wine/new', component: WineFormView },
    { path: '/wine/:id', component: WineDetailView },
    { path: '/wine/:id/edit', component: WineFormView },
    { path: '/:pathMatch(.*)*', redirect: '/collection' },
  ],
})
