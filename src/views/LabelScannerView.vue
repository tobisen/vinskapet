<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ArrowLeft, Camera, ImagePlus, RotateCcw, Search, X } from '@lucide/vue'
import { useRouter } from 'vue-router'
import WineImage from '@/components/WineImage.vue'
import WineTypeBadge from '@/components/WineTypeBadge.vue'
import { SystembolagetWineSearchProvider } from '@/search/SystembolagetWineSearchProvider'
import { supabase } from '@/services/supabase'
import { extractLabelSearchQueries, recognizeLabelText, searchRecognizedLabel, type LabelSearchDebug } from '@/services/wineLabelRecognition'
import type { WineSearchResult } from '@/types/search'

const router = useRouter()
const input = ref<HTMLInputElement>()
const preview = ref('')
const recognizing = ref(false)
const progress = ref(0)
const status = ref('')
const recognizedText = ref('')
const results = ref<WineSearchResult[]>([])
const error = ref('')
const debug = ref<LabelSearchDebug>()
const firstQuery = computed(() => extractLabelSearchQueries(recognizedText.value, 1)[0] ?? '')
const provider = new SystembolagetWineSearchProvider((name, options) => supabase.functions.invoke(name, options))

function releasePreview(): void {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = ''
}

async function scan(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  releasePreview()
  preview.value = URL.createObjectURL(file)
  recognizing.value = true
  progress.value = 0
  status.value = 'Förbereder bild…'
  recognizedText.value = ''
  results.value = []
  error.value = ''
  debug.value = undefined
  try {
    recognizedText.value = await recognizeLabelText(file, (update) => {
      progress.value = Math.round(update.progress * 100)
      status.value = update.status === 'recognizing text' ? 'Läser etiketten…' : 'Förbereder OCR…'
    })
    if (!extractLabelSearchQueries(recognizedText.value).length) {
      error.value = 'Ingen tydlig text kunde läsas. Prova ett nytt foto.'
      return
    }
    status.value = 'Söker efter vinet…'
    results.value = await searchRecognizedLabel(recognizedText.value, provider, (details) => {
      debug.value = details
      console.info('[label:OCR]', { text: recognizedText.value, ...details })
    })
  } catch {
    error.value = 'Etiketten kunde inte läsas just nu. Kontrollera anslutningen och försök igen.'
  } finally {
    recognizing.value = false
  }
}

function select(result: WineSearchResult): void {
  void router.push({ path: '/wine/search', query: { q: result.productNumber ?? result.name } })
}

function reset(): void {
  releasePreview()
  recognizedText.value = ''
  results.value = []
  error.value = ''
  debug.value = undefined
  progress.value = 0
  if (input.value) input.value.value = ''
}

onBeforeUnmount(releasePreview)
</script>

<template>
  <main class="scanner-page label-scanner-page">
    <header class="scanner-header"><button class="icon-button" type="button" aria-label="Stäng etikettskanner" title="Stäng" @click="router.push('/wine/new')"><X :size="22" /></button><strong>Skanna etikett</strong><span /></header>
    <section class="label-capture">
      <input ref="input" class="sr-only" type="file" accept="image/*" capture="environment" @change="scan" />
      <button v-if="!preview" class="label-camera-button" type="button" @click="input?.click()"><Camera :size="34" aria-hidden="true" /><strong>Fotografera etikett</strong></button>
      <template v-else>
        <img class="label-preview" :src="preview" alt="Fotograferad vinetikett" />
        <div v-if="recognizing" class="label-progress" role="status"><progress :value="progress" max="100" /><span>{{ status }} {{ progress }} %</span></div>
      </template>
    </section>

    <section v-if="!recognizing && preview" class="label-results">
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <template v-if="results.length">
        <div class="section-heading"><h1>Välj rätt vin</h1><span>{{ results.length }} träffar</span></div>
        <div class="search-results"><button v-for="result in results" :key="result.externalId ?? result.productNumber ?? result.name" type="button" @click="select(result)"><WineImage :src="result.imageUrl" :wine-type="result.wineType" size="sm" :alt="`${result.producer ?? 'Vin'} ${result.name}`" /><span><small>{{ result.producer }}</small><strong>{{ result.name }} <b v-if="result.vintage">{{ result.vintage }}</b></strong><em>{{ [result.region, result.country].filter(Boolean).join(' · ') }}</em></span><span class="search-result__aside"><WineTypeBadge v-if="result.wineType" :type="result.wineType" /><small v-if="result.productNumber">Nr {{ result.productNumber }}</small></span></button></div>
      </template>
      <div v-else-if="recognizedText && !error" class="empty-state"><Search :size="28" aria-hidden="true" /><h2>Ingen säker träff hittades</h2><RouterLink v-if="firstQuery" class="button button-primary" :to="{ path: '/wine/search', query: { q: firstQuery } }">Sök vidare</RouterLink></div>
      <details v-if="recognizedText" class="label-debug"><summary>Etikettdiagnostik</summary><strong>OCR-text</strong><pre>{{ recognizedText }}</pre><template v-if="debug"><strong>Sökningar</strong><ul><li v-for="search in debug.searches" :key="search.query"><code>{{ search.query }}</code><span>{{ search.error ?? `${search.matches} träffar` }}</span></li></ul><strong>Kandidater</strong><ul><li v-for="candidate in debug.candidates" :key="candidate.productNumber ?? `${candidate.producer}-${candidate.name}`"><span>{{ candidate.producer }} {{ candidate.name }}</span><small>{{ candidate.accepted ? 'Godkänd' : candidate.reason }}</small></li></ul></template></details>
      <div class="label-actions"><button class="button button-secondary" type="button" @click="reset(); input?.click()"><RotateCcw :size="18" aria-hidden="true" /> Ta nytt foto</button><RouterLink class="text-link" to="/wine/manual"><ImagePlus :size="17" aria-hidden="true" /> Lägg till manuellt</RouterLink></div>
      <button class="text-button" type="button" @click="router.push('/wine/new')"><ArrowLeft :size="17" aria-hidden="true" /> Tillbaka</button>
    </section>
  </main>
</template>
