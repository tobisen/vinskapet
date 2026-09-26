<script setup lang="ts">
import { computed } from 'vue'
import { Star } from '@lucide/vue'
import WineTypeBadge from '@/components/WineTypeBadge.vue'
import { useWineStore } from '@/composables/useWineStore'
import { formatDate } from '@/utils/format'

const store = useWineStore()
const events = computed(() => [...store.data.value.tastings].sort((a, b) => b.date.localeCompare(a.date)).map((tasting) => ({ tasting, wine: store.getWine(tasting.wineId) })).filter((event) => event.wine))
const buyLabels = { YES: 'Ja', MAYBE: 'Kanske', NO: 'Nej' }
</script>

<template>
  <main class="page">
    <header class="page-title"><p class="eyebrow">Smakminnen</p><h1>Historik</h1><p>{{ events.length }} registrerade tillfällen, även för viner som tagit slut.</p></header>
    <div class="history-list">
      <RouterLink v-for="event in events" :key="event.tasting.id" class="history-item" :to="`/wine/${event.wine!.id}`">
        <div class="history-item__date"><strong>{{ new Date(event.tasting.date).getDate() }}</strong><span>{{ formatDate(event.tasting.date).split(' ')[1] }}</span></div>
        <div class="history-item__content">
          <div class="history-item__top"><WineTypeBadge :type="event.wine!.wineType" /><span>{{ formatDate(event.tasting.date) }}</span></div>
          <p>{{ event.wine!.producer }}</p><h2>{{ event.wine!.name }} <span v-if="event.wine!.vintage">{{ event.wine!.vintage }}</span></h2>
          <p v-if="event.tasting.review" class="review">“{{ event.tasting.review }}”</p>
          <div class="history-item__meta"><span v-if="event.tasting.rating" class="rating"><Star :size="15" fill="currentColor" aria-hidden="true" /> {{ event.tasting.rating }}/5</span><span v-if="event.tasting.buyAgain">Köp igen: {{ buyLabels[event.tasting.buyAgain] }}</span></div>
        </div>
      </RouterLink>
    </div>
  </main>
</template>
