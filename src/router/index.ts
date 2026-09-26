import { createRouter, createWebHistory } from 'vue-router'
import CellarView from '@/views/CellarView.vue'
import CollectionView from '@/views/CollectionView.vue'
import HistoryView from '@/views/HistoryView.vue'
import WineDetailView from '@/views/WineDetailView.vue'
import WineFormView from '@/views/WineFormView.vue'
import WishlistView from '@/views/WishlistView.vue'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', redirect: '/collection' },
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
