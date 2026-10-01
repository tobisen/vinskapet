<script setup lang="ts">
import { ArrowLeft, Barcode, Camera, Keyboard, Search } from '@lucide/vue'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="form-page add-wine-page">
    <header class="form-page__header"><button class="back-link" type="button" @click="router.back()"><ArrowLeft :size="19" aria-hidden="true" /> Tillbaka</button></header>
    <div class="form-page__content">
      <div><p class="eyebrow">Nytt inköp</p><h1>Lägg till vin</h1></div>
      <nav class="add-methods" aria-label="Välj hur vinet ska läggas till">
        <RouterLink to="/wine/scan"><Barcode :size="24" aria-hidden="true" /><span><strong>Skanna streckkod</strong><small>Skanna flaskans streckkod</small></span></RouterLink>
        <RouterLink to="/wine/search"><Search :size="24" aria-hidden="true" /><span><strong>Sök vin</strong><small>Sök på vin, producent eller artikelnummer</small></span></RouterLink>
        <RouterLink to="/wine/label"><Camera :size="24" aria-hidden="true" /><span><strong>Skanna etikett</strong><small>Identifiera vin från etiketten</small></span></RouterLink>
        <RouterLink to="/wine/manual"><Keyboard :size="24" aria-hidden="true" /><span><strong>Lägg till manuellt</strong><small>Fyll i vinets grunduppgifter</small></span></RouterLink>
      </nav>
    </div>
  </main>
</template>
