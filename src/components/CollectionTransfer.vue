<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Clipboard, Download, FileUp, Upload } from '@lucide/vue'
import { useWineStore } from '@/composables/useWineStore'
import type { WineSummary } from '@/types/domain'
import { exportWinesToCsv, previewWineCsvImport } from '@/utils/wineCsv'
import ModalShell from './ModalShell.vue'

const props = defineProps<{ wines: readonly WineSummary[] }>()
const store = useWineStore()
const importOpen = ref(false)
const importText = ref('')
const fileInput = ref<HTMLInputElement>()
const feedback = ref('')
const importing = ref(false)
const preview = computed(() => importText.value.trim() ? previewWineCsvImport(importText.value, props.wines) : undefined)
const csv = computed(() => exportWinesToCsv(props.wines))

function fileName(): string {
  return `vinskapet-${new Date().toISOString().slice(0, 10)}.csv`
}

function downloadCsv(): void {
  const url = URL.createObjectURL(new Blob([csv.value], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName()
  link.click()
  URL.revokeObjectURL(url)
  feedback.value = 'CSV-filen har laddats ner.'
}

async function copyCsv(): Promise<void> {
  try {
    await navigator.clipboard.writeText(csv.value.replace(/^\uFEFF/, ''))
    feedback.value = 'CSV kopierad.'
  } catch {
    feedback.value = 'Kunde inte kopiera. Ladda ner CSV-filen i stället.'
  }
}

async function readFile(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importText.value = await file.text()
  if (fileInput.value) fileInput.value.value = ''
}

function closeImport(): void {
  if (importing.value) return
  importOpen.value = false
  importText.value = ''
}

async function applyImport(): Promise<void> {
  const current = preview.value
  if (!current || current.errors.length || !current.updates.length) return
  importing.value = true
  let updated = 0
  for (const item of current.updates) {
    if (await store.updateWine(item.wine, { silent: true })) updated += 1
  }
  await store.loadData(true)
  importing.value = false
  if (updated !== current.updates.length) {
    feedback.value = `${updated} av ${current.updates.length} viner uppdaterades.`
    return
  }
  feedback.value = `${updated} ${updated === 1 ? 'vin uppdaterades' : 'viner uppdaterades'}.`
  closeImport()
}
</script>

<template>
  <section class="collection-transfer" aria-label="Exportera och importera samlingen">
    <div class="collection-transfer__actions">
      <button class="button button-secondary button-compact" type="button" @click="copyCsv">
        <Clipboard :size="17" aria-hidden="true" /> Kopiera CSV
      </button>
      <button class="icon-button collection-transfer__icon" type="button" aria-label="Ladda ner CSV" title="Ladda ner CSV" @click="downloadCsv">
        <Download :size="18" aria-hidden="true" />
      </button>
      <button class="button button-secondary button-compact" type="button" @click="importOpen = true">
        <Upload :size="17" aria-hidden="true" /> Importera
      </button>
    </div>
    <span v-if="feedback" class="collection-transfer__feedback" role="status"><Check :size="15" aria-hidden="true" />{{ feedback }}</span>
  </section>

  <ModalShell v-if="importOpen" title="Importera vinmetadata" @close="closeImport">
    <div class="csv-import">
      <label class="field"><span>CSV-data</span><textarea v-model="importText" rows="9" placeholder="Klistra in CSV med kolumnen wine_id" /></label>
      <input ref="fileInput" class="sr-only" type="file" accept=".csv,text/csv,text/plain" @change="readFile" />
      <button class="button button-secondary" type="button" @click="fileInput?.click()"><FileUp :size="18" aria-hidden="true" /> Välj CSV-fil</button>

      <div v-if="preview" class="csv-import__preview" aria-live="polite">
        <div><strong>{{ preview.rowCount }}</strong><span>rader</span></div>
        <div><strong>{{ preview.updates.length }}</strong><span>uppdateras</span></div>
        <div><strong>{{ preview.unchanged }}</strong><span>oförändrade</span></div>
      </div>
      <ul v-if="preview?.errors.length" class="csv-import__errors">
        <li v-for="error in preview.errors" :key="error">{{ error }}</li>
      </ul>
      <details v-if="preview?.updates.length" class="csv-import__changes">
        <summary>Visa ändringar</summary>
        <ul><li v-for="item in preview.updates" :key="item.wine.id"><strong>{{ item.wine.producer }} {{ item.wine.name }}</strong><span>{{ item.changedFields.join(', ') }}</span></li></ul>
      </details>
      <button class="button button-primary button-block" type="button" :disabled="importing || !preview?.updates.length || Boolean(preview?.errors.length)" @click="applyImport">
        {{ importing ? 'Uppdaterar…' : 'Uppdatera befintliga viner' }}
      </button>
    </div>
  </ModalShell>
</template>
