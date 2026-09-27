<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, CameraOff, Keyboard, Search, X } from '@lucide/vue'
import { BarcodeFormat, BrowserMultiFormatOneDReader, type IScannerControls } from '@zxing/browser'
import { useRouter } from 'vue-router'
import { useWineStore } from '@/composables/useWineStore'
import { CompositeWineSearchProvider } from '@/search/CompositeWineSearchProvider'
import { LocalCollectionWineSearchProvider } from '@/search/LocalCollectionWineSearchProvider'
import { SystembolagetWineSearchProvider } from '@/search/SystembolagetWineSearchProvider'
import { supabase } from '@/services/supabase'
import type { WineSearchResult } from '@/types/search'
import { eanFormat, isValidEan, normalizeEan } from '@/utils/barcode'

const router = useRouter()
const store = useWineStore()
const video = ref<HTMLVideoElement>()
const code = ref('')
const manualCode = ref('')
const error = ref('')
const cameraActive = ref(false)
const identifying = ref(false)
const matches = ref<WineSearchResult[]>([])
const manualError = ref('')
let controls: IScannerControls | undefined
let handled = false

const provider = new CompositeWineSearchProvider([
  new LocalCollectionWineSearchProvider(() => store.summaries.value),
  new SystembolagetWineSearchProvider((name, options) => supabase.functions.invoke(name, options)),
])
const codeFormat = computed(() => code.value ? eanFormat(code.value) : null)
const isOnline = computed(() => navigator.onLine)

function stopCamera(): void {
  controls?.stop()
  controls = undefined
  cameraActive.value = false
  if (video.value?.srcObject instanceof MediaStream) {
    video.value.srcObject.getTracks().forEach((track) => track.stop())
    video.value.srcObject = null
  }
}

async function identifyBarcode(value: string): Promise<void> {
  if (handled) return
  handled = true
  code.value = normalizeEan(value)
  stopCamera()
  navigator.vibrate?.(70)
  if (!navigator.onLine) return

  identifying.value = true
  matches.value = await provider.lookupBarcode?.(code.value) ?? []
  if (!matches.value.length) matches.value = await provider.search(code.value)
  identifying.value = false
}

async function startCamera(): Promise<void> {
  error.value = ''
  handled = false
  await nextTick()
  if (!navigator.mediaDevices?.getUserMedia || !video.value) {
    error.value = 'Kameran stöds inte av den här webbläsaren. Ange streckkoden manuellt.'
    return
  }

  try {
    const reader = new BrowserMultiFormatOneDReader()
    reader.possibleFormats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8]
    controls = await reader.decodeFromConstraints(
      { audio: false, video: { facingMode: { ideal: 'environment' } } },
      video.value,
      (result) => {
        if (result && isValidEan(result.getText())) void identifyBarcode(result.getText())
      },
    )
    cameraActive.value = true
  } catch (cause) {
    stopCamera()
    const denied = cause instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(cause.name)
    error.value = denied
      ? 'Kameraåtkomst nekades. Tillåt kameran i webbläsarens inställningar eller ange koden manuellt.'
      : 'Kameran kunde inte startas. Kontrollera att ingen annan app använder den.'
  }
}

function submitManual(): void {
  manualError.value = ''
  if (!isValidEan(manualCode.value)) {
    manualError.value = 'Ange en giltig EAN-8- eller EAN-13-kod.'
    return
  }
  void identifyBarcode(manualCode.value)
}

function resetScanner(): void {
  code.value = ''
  manualCode.value = ''
  matches.value = []
  handled = false
  void startCamera()
}

function close(): void {
  stopCamera()
  void router.push('/wine/new')
}

onMounted(startCamera)
onBeforeUnmount(stopCamera)
</script>

<template>
  <main class="scanner-page">
    <header class="scanner-header"><button class="icon-button" type="button" aria-label="Stäng scanner" title="Stäng" @click="close"><X :size="22" /></button><strong>Skanna streckkod</strong><span /></header>

    <section v-if="!code" class="scanner-camera">
      <video ref="video" muted playsinline aria-label="Kameravy för streckkod" />
      <div class="scan-guide" aria-hidden="true"><span /></div>
      <p>Rikta kameran mot flaskans streckkod</p>
      <div v-if="!cameraActive && !error" class="scanner-loading"><span class="loading-spinner" /><span>Startar kameran…</span></div>
    </section>

    <section v-else class="scanner-result">
      <p class="eyebrow">{{ codeFormat }} avläst</p><h1>{{ code }}</h1>
      <p v-if="!isOnline" class="form-error">Ingen internetanslutning. Sökning kan göras när du är online.</p>
      <p v-else-if="identifying" role="status">Identifierar produkten…</p>
      <div v-else-if="matches.length" class="scanner-match"><strong>{{ matches[0]?.name }}</strong><span>{{ matches[0]?.producer }}</span><RouterLink class="button button-primary" :to="{ path: '/wine/search', query: { q: code } }">Visa vin</RouterLink></div>
      <div v-else class="scanner-no-match"><CameraOff :size="30" aria-hidden="true" /><h2>Vi kunde inte identifiera streckkoden</h2><p>Koden sparas inte ännu. Sök fram vinet eller lägg till det manuellt.</p><RouterLink class="button button-primary" :to="{ path: '/wine/search', query: { q: code, barcode: code } }"><Search :size="18" /> Sök vin</RouterLink><RouterLink class="button button-secondary" :to="{ path: '/wine/manual', query: { barcode: code } }">Lägg till manuellt</RouterLink></div>
      <button class="text-button" type="button" @click="resetScanner"><ArrowLeft :size="17" /> Skanna igen</button>
    </section>

    <section v-if="!code" class="scanner-manual">
      <div v-if="error" class="form-error" role="alert">{{ error }}</div>
      <form class="form-stack" @submit.prevent="submitManual">
        <label class="field"><span><Keyboard :size="16" aria-hidden="true" /> Ange koden manuellt</span><input v-model="manualCode" inputmode="numeric" autocomplete="off" placeholder="8 eller 13 siffror" /></label>
        <p v-if="manualError" class="form-error" role="alert">{{ manualError }}</p>
        <button class="button button-secondary button-block" type="submit">Identifiera kod</button>
      </form>
    </section>
  </main>
</template>
