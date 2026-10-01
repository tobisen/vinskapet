<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { ArrowLeft, Heart, Search } from "@lucide/vue";
import { useRoute, useRouter } from "vue-router";
import InventoryForm from "@/components/InventoryForm.vue";
import QuantityStepper from "@/components/QuantityStepper.vue";
import WineImage from "@/components/WineImage.vue";
import WineTypeBadge from "@/components/WineTypeBadge.vue";
import { useWineStore } from "@/composables/useWineStore";
import { CompositeWineSearchProvider } from "@/search/CompositeWineSearchProvider";
import { LatestWineSearch } from "@/search/LatestWineSearch";
import { LocalCollectionWineSearchProvider } from "@/search/LocalCollectionWineSearchProvider";
import { SystembolagetWineSearchProvider } from "@/search/SystembolagetWineSearchProvider";
import { FreeBarcodeSearchProvider } from "@/search/FreeBarcodeSearchProvider";
import {
  findDuplicateWine,
  saveWinePurchase,
  saveWineToWishlist,
} from "@/search/duplicates";
import { wineFromSearchResult } from "@/search/wineFromSearchResult";
import type { InventoryInput, WineType } from "@/types/domain";
import type { WineSearchResult } from "@/types/search";
import { formatCurrency } from "@/utils/format";
import { supabase } from "@/services/supabase";
import { wineEnrichmentService } from "@/services/wineEnrichment";
import { repositories } from "@/services/repository";
import { isValidEan, normalizeEan } from "@/utils/barcode";
import { BarcodeLookupService, shouldRunBarcodeLookup } from "@/services/barcodeLookup";

function debugBarcode(message: string, details?: unknown): void {
  console.info(`[barcode:FALLBACK] ${message}`, details ?? "");
}

const route = useRoute();
const router = useRouter();
const store = useWineStore();
const query = ref(typeof route.query.q === "string" ? route.query.q : "");
const pendingBarcode = computed(() =>
  typeof route.query.barcode === "string" && isValidEan(route.query.barcode)
    ? normalizeEan(route.query.barcode)
    : "",
);
const linkBarcode = ref(true);
const results = ref<WineSearchResult[]>([]);
const selected = ref<WineSearchResult>();
const loading = ref(false);
const searched = ref(false);
const externalError = ref(false);
const confirmedVintage = ref<number>();
const confirmedWineType = ref<WineType>();
const selectionError = ref("");
const saveTarget = ref<"COLLECTION" | "WISHLIST">("COLLECTION");
const wishlistQuantity = ref(1);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

const systembolagetProvider = new SystembolagetWineSearchProvider(
  (name, options) => supabase.functions.invoke(name, options),
  () => {
    externalError.value = true;
  },
);
const fallbackProvider = new FreeBarcodeSearchProvider(
  (name, options) => supabase.functions.invoke(name, options),
);
const barcodeLookup = new BarcodeLookupService(
  repositories.barcodes,
  (id) => store.getWine(id),
  systembolagetProvider,
  fallbackProvider,
  (entry) => debugBarcode(`${entry.stage}: ${entry.message}`, entry.details),
);
const provider = new CompositeWineSearchProvider([
  new LocalCollectionWineSearchProvider(() => store.summaries.value),
  systembolagetProvider,
  fallbackProvider,
]);
const latestSearch = new LatestWineSearch(provider);
const manualTarget = computed(() => ({
  path: "/wine/manual",
  query: {
    ...(query.value.trim() ? { name: query.value.trim() } : {}),
    ...(pendingBarcode.value ? { barcode: pendingBarcode.value } : {}),
  },
}));

async function saveBarcodeMapping(
  wineId: string,
  source: WineSearchResult["source"],
): Promise<boolean> {
  if (!pendingBarcode.value || !linkBarcode.value) return true;
  try {
    await repositories.barcodes.addMapping(
      pendingBarcode.value,
      wineId,
      source === "SYSTEMBOLAGET" ? "SYSTEMBOLAGET" : source === "OPEN_FOOD_FACTS" ? "OPEN_FOOD_FACTS" : "MANUAL",
    );
    debugBarcode("EAN↔Wine-koppling sparad.", { barcode: pendingBarcode.value, wineId, source });
    return true;
  } catch {
    selectionError.value =
      "Vinet sparades, men streckkodskopplingen kunde inte sparas.";
    return false;
  }
}

watch(
  [query, pendingBarcode],
  ([value, barcode]) => {
    clearTimeout(debounceTimer);
    selected.value = undefined;
    externalError.value = false;

    if (shouldRunBarcodeLookup(barcode, value) && route.query.lookup !== "done") {
      loading.value = true;
      debugBarcode("Automatisk EAN-sökning från sökvyn.", { barcode });
      void (async () => {
        try {
          const lookupResult = await barcodeLookup.lookup(barcode, navigator.onLine);
          const matches = lookupResult.status === "MATCH" ? [lookupResult.result] : [];
          results.value = matches;
          debugBarcode("EAN-sökning klar.", { matches: matches.length });
          searched.value = true;
        } catch {
          results.value = [];
          searched.value = true;
        } finally {
          loading.value = false;
        }
      })();
      return;
    }

    if (value.trim().length < 3) {
      latestSearch.cancel();
      results.value = [];
      searched.value = false;
      loading.value = false;
      return;
    }
    loading.value = true;
    debugBarcode("Manuell textsökning med bibehållen EAN.", { barcode, query: value.trim() });
    debounceTimer = setTimeout(async () => {
      const response = await latestSearch.search(value);
      if (response.stale) return;
      results.value = response.results;
      loading.value = false;
      searched.value = true;
    }, 450);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  clearTimeout(debounceTimer);
  latestSearch.cancel();
});

async function addInventory(input: InventoryInput): Promise<void> {
  const wine = selected.value?.existingWine;
  if (
    wine &&
    (await store.addInventory(wine.id, input)) &&
    (await saveBarcodeMapping(wine.id, selected.value!.source))
  )
    await router.push(`/wine/${wine.id}`);
}

function selectResult(result: WineSearchResult): void {
  selected.value = result;
  confirmedVintage.value = result.vintage;
  confirmedWineType.value = result.wineType;
  selectionError.value = "";
  saveTarget.value = result.existingWine?.status === "WISHLIST" ? "WISHLIST" : "COLLECTION";
  wishlistQuantity.value = result.existingWine?.wishlistQuantity ?? 1;
}

async function addExistingToWishlist(): Promise<void> {
  const existing = selected.value?.existingWine;
  if (!existing) return;
  if (existing.status === "COLLECTION") {
    selectionError.value = "Vinet finns redan i samlingen och läggs därför inte till på önskelistan.";
    return;
  }
  if (await store.addToWishlist(existing.id)) await router.push(`/wine/${existing.id}`);
}

async function addExternalPurchase(input: InventoryInput): Promise<void> {
  const result = selected.value;
  if (!result || result.existingWine) return;
  if (!result.producer || !confirmedWineType.value) {
    selectionError.value =
      "Producent och vintyp måste anges. Lägg till vinet manuellt om uppgifterna saknas.";
    return;
  }
  const wine = wineFromSearchResult(
    result,
    confirmedVintage.value,
    confirmedWineType.value,
  );
  const duplicate = findDuplicateWine(result, store.summaries.value);
  const saved = await saveWinePurchase(wine, input, duplicate, {
    createWine: store.createWine,
    addInventory: store.addInventory,
  });
  if (saved.saved) {
    if (!(await saveBarcodeMapping(saved.wineId, result.source))) return;
    if (!duplicate)
      void store.enrichWine(saved.wineId, wineEnrichmentService, {
        silent: true,
      });
    await router.push(`/wine/${saved.wineId}`);
  }
}

async function addExternalWishlist(): Promise<void> {
  const result = selected.value;
  if (!result || result.existingWine) return;
  if (!result.producer || !confirmedWineType.value) {
    selectionError.value =
      "Producent och vintyp måste anges. Lägg till vinet manuellt om uppgifterna saknas.";
    return;
  }

  const wine = {
    ...wineFromSearchResult(
      result,
      confirmedVintage.value,
      confirmedWineType.value,
      "WISHLIST",
    ),
    wishlistQuantity: wishlistQuantity.value,
  };
  const duplicate = findDuplicateWine(result, store.summaries.value);
  const saved = await saveWineToWishlist(wine, duplicate, {
    createWine: store.createWine,
    updateWine: store.updateWine,
  });
  if (saved.reason === "IN_COLLECTION") {
    selectionError.value = "Vinet finns redan i samlingen och skapades inte på nytt.";
    return;
  }
  if (saved.saved) {
    if (!(await saveBarcodeMapping(saved.wineId, result.source))) return;
    if (saved.created)
      void store.enrichWine(saved.wineId, wineEnrichmentService, { silent: true });
    await router.push(`/wine/${saved.wineId}`);
  }
}
</script>

<template>
  <main class="form-page search-wine-page">
    <header class="form-page__header">
      <button class="back-link" type="button" @click="router.back()">
        <ArrowLeft :size="19" aria-hidden="true" /> Tillbaka
      </button>
    </header>
    <div class="form-page__content">
      <div>
        <p class="eyebrow">Hitta rätt flaska</p>
        <h1>Sök vin</h1>
      </div>
      <div v-if="pendingBarcode" class="barcode-link-notice">
        <strong>Streckkoden lästes</strong><span>{{ pendingBarcode }}</span>
        <p>Välj rätt vin för att lära Vinskåpet denna kod.</p>
      </div>
      <label class="search-field search-field--large"
        ><Search :size="20" aria-hidden="true" /><span class="sr-only"
          >Sök vin, producent eller artikelnummer</span
        ><input
          v-model="query"
          autofocus
          placeholder="Vin, producent eller artikelnummer"
          autocomplete="off"
      /></label>

      <div v-if="selected?.existingWine" class="quick-add-panel">
        <button class="text-button" type="button" @click="selected = undefined">
          <ArrowLeft :size="17" /> Till resultat
        </button>
        <div>
          <p class="eyebrow">
            {{ selected.existingWine.status === "WISHLIST" ? "Finns på önskelistan" : "Finns i Vinskåpet" }}
          </p>
          <h2>
            {{ selected.name }}
            <span v-if="selected.vintage">{{ selected.vintage }}</span>
          </h2>
          <p>
            {{ selected.producer }} · {{ selected.quantity }}
            {{ selected.quantity === 1 ? "flaska" : "flaskor" }}
          </p>
        </div>
        <label v-if="pendingBarcode" class="checkbox-field"
          ><input v-model="linkBarcode" type="checkbox" /><span
            >Koppla denna streckkod till vinet</span
          ></label
        ><p v-if="selectionError" class="form-error" role="alert">{{ selectionError }}</p>
        <InventoryForm
          :submit-label="selected.existingWine.status === 'WISHLIST' ? 'Jag har köpt det' : 'Lägg till i samlingen'"
          :saving="store.isSaving.value"
          :initial-quantity="selected.existingWine.status === 'WISHLIST' ? (selected.existingWine.wishlistQuantity ?? 1) : 1"
          :initial-price="selected.referencePrice"
          @submit="addInventory"
        />
        <button
          v-if="selected.existingWine.status !== 'COLLECTION' && selected.existingWine.status !== 'WISHLIST'"
          class="button button-secondary button-block"
          type="button"
          :disabled="store.isSaving.value"
          @click="addExistingToWishlist"
        >
          <Heart :size="18" aria-hidden="true" /> Lägg till i önskelistan
        </button>
      </div>

      <div v-else-if="selected" class="quick-add-panel external-wine-panel">
        <button class="text-button" type="button" @click="selected = undefined">
          <ArrowLeft :size="17" /> Till resultat
        </button>
        <div class="external-wine-panel__heading">
          <WineImage
            :src="selected.imageUrl"
            :wine-type="selected.wineType"
            size="md"
            :alt="`${selected.producer ?? 'Vin'} ${selected.name}`"
          />
          <div>
            <p class="eyebrow">
              Systembolaget · Nr {{ selected.productNumber }}
            </p>
            <h2>{{ selected.name }}</h2>
            <p>
              {{ selected.producer
              }}<span v-if="selected.region || selected.country">
                ·
                {{
                  [selected.region, selected.country].filter(Boolean).join(", ")
                }}</span
              >
            </p>
          </div>
        </div>
        <div class="external-wine-panel__facts">
          <span v-if="selected.grapes?.length"
            ><small>Druvor</small
            ><strong>{{ selected.grapes.join(", ") }}</strong></span
          >
          <span v-if="selected.alcoholPercentage"
            ><small>Alkohol</small
            ><strong>{{ selected.alcoholPercentage }} %</strong></span
          >
          <span v-if="selected.referencePrice"
            ><small>Referenspris</small
            ><strong>{{
              formatCurrency(selected.referencePrice, selected.currency)
            }}</strong></span
          >
        </div>
        <div class="field-row confirmation-fields">
          <label class="field"
            ><span>Bekräfta årgång</span
            ><input
              v-model.number="confirmedVintage"
              type="number"
              min="1900"
              max="2100"
              inputmode="numeric"
              :placeholder="
                selected.vintage
                  ? String(selected.vintage)
                  : 'Årgång på flaskan'
              "
            /><small>Kan skilja sig från produktsidan.</small></label
          >
          <label class="field"
            ><span>Vintyp</span
            ><select v-model="confirmedWineType">
              <option :value="undefined" disabled>Välj vintyp</option>
              <option value="RED">Rött</option>
              <option value="WHITE">Vitt</option>
              <option value="ROSE">Rosé</option>
              <option value="SPARKLING_WHITE">Mousserande</option>
              <option value="SPARKLING_ROSE">Mousserande rosé</option>
              <option value="ORANGE">Orange</option>
              <option value="DESSERT">Dessertvin</option>
              <option value="FORTIFIED">Starkvin</option>
            </select></label
          >
        </div>
        <p v-if="selectionError" class="form-error" role="alert">
          {{ selectionError }}
        </p>
        <label v-if="pendingBarcode" class="checkbox-field"
          ><input v-model="linkBarcode" type="checkbox" /><span
            >Koppla denna streckkod till vinet</span
          ></label
        >
        <div class="segmented form-mode" aria-label="Välj vart vinet ska sparas">
          <button
            type="button"
            :class="{ selected: saveTarget === 'COLLECTION' }"
            @click="saveTarget = 'COLLECTION'"
          >
            Samlingen
          </button>
          <button
            type="button"
            :class="{ selected: saveTarget === 'WISHLIST' }"
            @click="saveTarget = 'WISHLIST'"
          >
            Önskelistan
          </button>
        </div>
        <InventoryForm
          v-if="saveTarget === 'COLLECTION'"
          submit-label="Lägg till i samlingen"
          :saving="store.isSaving.value"
          :initial-price="selected.referencePrice"
          @submit="addExternalPurchase"
        />
        <template v-else>
          <QuantityStepper
            v-model="wishlistQuantity"
            label="Önskat antal flaskor"
            :disabled="store.isSaving.value"
          />
          <button
            class="button button-primary button-block"
            type="button"
            :disabled="store.isSaving.value"
            @click="addExternalWishlist"
          >
            <Heart :size="18" aria-hidden="true" /> Lägg till i önskelistan
          </button>
        </template>
      </div>

      <template v-else>
        <p v-if="loading" class="search-feedback" role="status">
          Söker i samlingen och på Systembolaget…
        </p>
        <template v-else>
          <p v-if="externalError" class="form-error" role="alert">
            Kunde inte söka hos Systembolaget just nu. Lokala träffar visas
            fortfarande.
          </p>
          <div v-if="results.length" class="search-results">
            <button
              v-for="result in results"
              :key="`${result.source}-${result.externalId ?? result.productNumber ?? result.name}`"
              type="button"
              @click="selectResult(result)"
            >
              <WineImage
                :src="result.imageUrl"
                :wine-type="result.wineType"
                size="sm"
                :alt="`${result.producer ?? 'Vin'} ${result.name}`"
              />
              <span
                ><small>{{ result.producer }}</small
                ><strong
                  >{{ result.name }}
                  <b v-if="result.vintage">{{ result.vintage }}</b></strong
                ><em>{{
                  [result.region, result.country].filter(Boolean).join(" · ")
                }}</em></span
              >
              <span class="search-result__aside"
                ><WineTypeBadge
                  v-if="result.wineType"
                  :type="result.wineType"
                /><small>{{
                  result.source === "LOCAL_COLLECTION"
                    ? `Finns redan · ${result.quantity}`
                    : `Systembolaget · Nr ${result.productNumber}`
                }}</small
                ><b v-if="result.referencePrice">{{
                  formatCurrency(result.referencePrice, result.currency)
                }}</b></span
              >
            </button>
          </div>
          <div
            v-else-if="searched && !externalError"
            class="empty-state search-empty"
          >
            <Search :size="28" aria-hidden="true" />
            <h2>
              {{
                route.query.barcode
                  ? "Streckkoden kunde läsas, men vi hittade ingen matchande produkt."
                  : "Ingen produkt hittades på Systembolaget."
              }}
            </h2>
            <p>
              Prova ett artikelnummer, ett annat sökord eller lägg till vinet
              manuellt.
            </p>
            <RouterLink class="button button-primary" :to="manualTarget"
              >Lägg till manuellt</RouterLink
            >
          </div>
        </template>
      </template>
    </div>
  </main>
</template>
