<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, CameraOff, Keyboard, Search, X } from '@lucide/vue'
import { BarcodeFormat, BrowserMultiFormatOneDReader, type IScannerControls } from '@zxing/browser'
import { useRouter } from 'vue-router'
import InventoryForm from '@/components/InventoryForm.vue'
import WineImage from '@/components/WineImage.vue'
import WineTypeBadge from '@/components/WineTypeBadge.vue'
import { useWineStore } from '@/composables/useWineStore'
import { findDuplicateWine } from '@/search/duplicates'
import { OpenFoodFactsBarcodeSearchProvider } from '@/search/OpenFoodFactsBarcodeSearchProvider'
import { SystembolagetWineSearchProvider } from '@/search/SystembolagetWineSearchProvider'
import { wineFromSearchResult } from '@/search/wineFromSearchResult'
import { repositories } from '@/services/repository'
import { supabase } from '@/services/supabase'
import { BarcodeLookupService, saveBarcodePurchase, type BarcodeLookupResult } from '@/services/barcodeLookup'
import { wineEnrichmentService } from '@/services/wineEnrichment'
import type { InventoryInput, WineBarcodeSource, WineType } from '@/types/domain'
import type { WineSearchResult } from '@/types/search'
import { eanFormat, isValidEan, normalizeEan } from '@/utils/barcode'
import { formatCurrency } from '@/utils/format'
import { stopMediaTracks } from '@/utils/scanner'

const router = useRouter()
const store = useWineStore()
const video = ref<HTMLVideoElement>()
const code = ref('')
const manualCode = ref('')
const error = ref('')
const cameraActive = ref(false)
const identifying = ref(false)
const lookupStatus = ref<BarcodeLookupResult['status']>()
const match = ref<WineSearchResult>()
const manualError = ref('')
const selectionError = ref('')
const confirmedVintage = ref<number>()
const confirmedWineType = ref<WineType>()
const withoutVintage = ref(false)
const mappingSource = ref<WineBarcodeSource>('MANUAL')
let controls: IScannerControls | undefined
let handled = false

const systembolaget = new SystembolagetWineSearchProvider((name, options) => supabase.functions.invoke(name, options))
const openFoodFacts = new OpenFoodFactsBarcodeSearchProvider((name, options) => supabase.functions.invoke(name, options))
const lookup = new BarcodeLookupService(repositories.barcodes, (id) => store.getWine(id), systembolaget, openFoodFacts)
const codeFormat = computed(() => code.value ? eanFormat(code.value) : null)
const existingWine = computed(() => match.value?.existingWine ?? (match.value ? findDuplicateWine(match.value, store.summaries.value) : undefined))
const existingQuantity = computed(() => existingWine.value ? store.getWine(existingWine.value.id)?.quantity ?? 0 : 0)
const searchTarget = computed(() => ({ path: '/wine/search', query: { barcode: code.value } }))
const manualTarget = computed(() => ({ path: '/wine/manual', query: { barcode: code.value } }))

function stopCamera(): void {
  controls?.stop()
  controls = undefined
  cameraActive.value = false
  if (video.value?.srcObject) {
    stopMediaTracks(video.value.srcObject as MediaStream)
    video.value.srcObject = null
  }
}

async function identifyBarcode(value: string): Promise<void> {
  if (handled) return
  const normalized = normalizeEan(value)
  if (!isValidEan(normalized)) return
  handled = true
  code.value = normalized
  stopCamera()
  navigator.vibrate?.(70)
  identifying.value = true
  const result = await lookup.lookup(normalized, navigator.onLine)
  lookupStatus.value = result.status
  match.value = result.status === 'MATCH' ? result.result : undefined
  mappingSource.value = result.status === 'MATCH'
    ? result.mappingSource ?? (result.source === 'SYSTEMBOLAGET' ? 'SYSTEMBOLAGET' : result.source === 'OPEN_FOOD_FACTS' ? 'OPEN_FOOD_FACTS' : 'MANUAL')
    : 'MANUAL'
  confirmedVintage.value = match.value?.vintage
  confirmedWineType.value = match.value?.wineType
  withoutVintage.value = match.value?.vintage == null && Boolean(match.value?.wineType?.startsWith('SPARKLING'))
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
      (result) => { if (result && isValidEan(result.getText())) void identifyBarcode(result.getText()) },
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

async function saveMatch(input: InventoryInput): Promise<void> {
  const result = match.value
  if (!result) return
  selectionError.value = ''
  if (!result.producer?.trim() || !confirmedWineType.value) {
    selectionError.value = 'Producent och vintyp måste vara kända. Sök fram vinet för att koppla streckkoden.'
    return
  }
  if (!confirmedVintage.value && !withoutVintage.value) {
    selectionError.value = 'Ange årgång eller välj Utan årgång / NV.'
    return
  }

  const wine = wineFromSearchResult(result, withoutVintage.value ? null : confirmedVintage.value, confirmedWineType.value)
  const duplicate = existingWine.value
  let saved: { saved: boolean; wineId: string }
  try {
    saved = await saveBarcodePurchase({
      barcode: code.value,
      wine,
      existingWine: duplicate,
      inventory: input,
      source: mappingSource.value,
      mappings: repositories.barcodes,
      createWine: store.createWine,
      addInventory: store.addInventory,
    })
  } catch {
    selectionError.value = 'Vinet sparades, men streckkodskopplingen kunde inte sparas.'
    return
  }
  if (!saved.saved) return
  if (!duplicate) void store.enrichWine(saved.wineId, wineEnrichmentService, { silent: true })
  await router.push(`/wine/${saved.wineId}`)
}

function resetScanner(): void {
  code.value = ''
  manualCode.value = ''
  match.value = undefined
  lookupStatus.value = undefined
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
      <p>Placera streckkoden i rutan</p>
      <div v-if="!cameraActive && !error" class="scanner-loading"><span class="loading-spinner" /><span>Startar kameran…</span></div>
    </section>

    <section v-else class="scanner-result">
      <p class="eyebrow">Streckkoden lästes · {{ codeFormat }}</p><h1>{{ code }}</h1>
      <p v-if="identifying" role="status">Söker efter vin…</p>

      <div v-else-if="match" class="scanner-confirmation">
        <div class="external-wine-panel__heading"><WineImage :src="match.imageUrl" :wine-type="match.wineType" size="md" :alt="`${match.producer ?? 'Vin'} ${match.name}`" /><div><p class="eyebrow">{{ match.source === 'LOCAL_COLLECTION' ? 'Finns redan i Vinskåpet' : match.source === 'SYSTEMBOLAGET' ? `Systembolaget · Nr ${match.productNumber}` : 'Open Food Facts' }}</p><h2>{{ match.name }}</h2><p>{{ match.producer }}<template v-if="match.region || match.country"> · {{ [match.region, match.country].filter(Boolean).join(', ') }}</template></p><strong v-if="existingWine">Nuvarande antal: {{ existingQuantity }} flaskor</strong><strong v-else-if="match.referencePrice">{{ formatCurrency(match.referencePrice, match.currency) }}</strong></div></div>
        <div class="field-row"><label class="field"><span>Årgång</span><input v-model.number="confirmedVintage" type="number" min="1900" max="2100" :disabled="withoutVintage" inputmode="numeric" /></label><label class="field"><span>Vintyp</span><select v-model="confirmedWineType"><option :value="undefined" disabled>Välj vintyp</option><option value="RED">Rött</option><option value="WHITE">Vitt</option><option value="ROSE">Rosé</option><option value="SPARKLING_WHITE">Mousserande</option><option value="SPARKLING_ROSE">Mousserande rosé</option><option value="ORANGE">Orange</option><option value="DESSERT">Dessertvin</option><option value="FORTIFIED">Starkvin</option></select></label></div>
        <label class="checkbox-field"><input v-model="withoutVintage" type="checkbox" @change="withoutVintage && (confirmedVintage = undefined)" /><span>Utan årgång / NV</span></label>
        <WineTypeBadge v-if="confirmedWineType" :type="confirmedWineType" />
        <p v-if="selectionError" class="form-error" role="alert">{{ selectionError }}</p>
        <InventoryForm :submit-label="existingWine ? 'Lägg till flaska' : 'Lägg till i Vinskåpet'" :saving="store.isSaving.value" :initial-price="match.referencePrice" :initial-location="mappingSource === 'SYSTEMBOLAGET' ? 'Systembolaget' : ''" @submit="saveMatch" />
        <RouterLink class="text-link" :to="searchTarget">Sök efter ett annat vin</RouterLink>
      </div>

      <div v-else-if="lookupStatus === 'OFFLINE'" class="scanner-no-match"><CameraOff :size="30" aria-hidden="true" /><h2>Produktinformationen kräver internet</h2><p>Streckkoden är kvar och kan sökas igen när du är online.</p></div>
      <div v-else-if="lookupStatus === 'ERROR'" class="scanner-no-match"><CameraOff :size="30" aria-hidden="true" /><h2>Sökningen kunde inte genomföras</h2><p>Streckkoden är kvar. Försök igen eller sök fram vinet manuellt.</p><RouterLink class="button button-primary" :to="searchTarget"><Search :size="18" /> Sök efter vinet</RouterLink></div>
      <div v-else class="scanner-no-match"><CameraOff :size="30" aria-hidden="true" /><h2>Vi hittade inte vinet automatiskt.</h2><p>Streckkoden är kvar. Sök fram rätt vin och koppla den för nästa scanning.</p><RouterLink class="button button-primary" :to="searchTarget"><Search :size="18" /> Sök efter vinet</RouterLink><RouterLink class="button button-secondary" :to="manualTarget">Lägg till manuellt</RouterLink></div>
      <button class="text-button" type="button" @click="resetScanner"><ArrowLeft :size="17" /> Skanna igen</button>
    </section>

    <section v-if="!code" class="scanner-manual">
      <div v-if="error" class="form-error" role="alert">{{ error }}</div>
      <form class="form-stack" @submit.prevent="submitManual">
        <label class="field"><span><Keyboard :size="16" aria-hidden="true" /> Ange streckkod manuellt</span><input v-model="manualCode" inputmode="numeric" autocomplete="off" placeholder="8 eller 13 siffror" /></label>
        <p v-if="manualError" class="form-error" role="alert">{{ manualError }}</p>
        <button class="button button-secondary button-block" type="submit">Identifiera kod</button>
      </form>
    </section>
  </main>
</template>
