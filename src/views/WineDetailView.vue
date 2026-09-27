<script setup lang="ts">
import { computed, ref } from "vue";
import {
  ArrowLeft,
  Edit3,
  Image as ImageIcon,
  MinusCircle,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Wine as WineIcon,
} from "@lucide/vue";
import { useRoute, useRouter } from "vue-router";
import ConsumeForm from "@/components/ConsumeForm.vue";
import DrinkingStatusBadge from "@/components/DrinkingStatusBadge.vue";
import InventoryForm from "@/components/InventoryForm.vue";
import ModalShell from "@/components/ModalShell.vue";
import WineImage from "@/components/WineImage.vue";
import WineTypeBadge from "@/components/WineTypeBadge.vue";
import { useWineStore } from "@/composables/useWineStore";
import { wineEnrichmentService } from "@/services/wineEnrichment";
import { SystembolagetWineSearchProvider } from "@/search/SystembolagetWineSearchProvider";
import { supabase } from "@/services/supabase";
import type { ConsumeInput, InventoryInput, Tasting } from "@/types/domain";
import type { WineSearchResult } from "@/types/search";
import { formatCurrency, formatDate } from "@/utils/format";
import {
  calculateAverageRating,
  getStorageRecommendation,
  storageLocationLabels,
} from "@/utils/wine";
import { getMissingEnrichmentFields } from "@/utils/wineEnrichment";

const route = useRoute();
const router = useRouter();
const store = useWineStore();
const wine = computed(() => store.getWine(String(route.params.id)));
const inventory = computed(() =>
  wine.value ? store.getInventory(wine.value.id) : [],
);
const tastings = computed(() =>
  wine.value
    ? [...store.getTastings(wine.value.id)].sort((a, b) =>
        b.date.localeCompare(a.date),
      )
    : [],
);
const averageRating = computed(() => calculateAverageRating(tastings.value));
const latestBuyAgain = computed(
  () => tastings.value.find((item) => item.buyAgain)?.buyAgain,
);
const modal = ref<
  "consume" | "add" | "correct" | "image" | "deleteWine" | "deleteTasting"
>();
const selectedTasting = ref<Tasting>();
const correctedQuantity = ref(0);
const imageResults = ref<WineSearchResult[]>([]);
const imageLoading = ref(false);
const imageError = ref("");
const buyLabels = { YES: "Ja", MAYBE: "Kanske", NO: "Nej" };
const missingMetadata = computed(() =>
  wine.value ? getMissingEnrichmentFields(wine.value) : [],
);
const enrichmentStatus = computed(() =>
  wine.value
    ? (store.enrichmentStatuses.value[wine.value.id] ?? "IDLE")
    : "IDLE",
);
const systembolagetProvider = new SystembolagetWineSearchProvider(
  (name, options) => supabase.functions.invoke(name, options),
);

async function add(input: InventoryInput): Promise<void> {
  if (!wine.value) return;
  if (await store.addInventory(wine.value.id, input)) modal.value = undefined;
}

async function consume(input: ConsumeInput): Promise<void> {
  if (!wine.value) return;
  if (await store.consumeBottle(wine.value.id, input)) modal.value = undefined;
}

async function decrement(): Promise<void> {
  if (!wine.value) return;
  if (await store.removeBottle(wine.value.id)) modal.value = undefined;
}

function openCorrection(): void {
  correctedQuantity.value = wine.value?.quantity ?? 0;
  modal.value = "correct";
}

async function correct(): Promise<void> {
  if (!wine.value) return;
  if (
    await store.correctInventory(
      wine.value.id,
      inventory.value,
      correctedQuantity.value,
    )
  )
    modal.value = undefined;
}

async function enrich(): Promise<void> {
  if (wine.value) await store.enrichWine(wine.value.id, wineEnrichmentService);
}

async function openImageLookup(): Promise<void> {
  if (!wine.value) return;
  modal.value = "image";
  imageLoading.value = true;
  imageError.value = "";
  imageResults.value = [];
  try {
    imageResults.value = (
      await systembolagetProvider.search(wine.value.name)
    ).filter((result) => result.imageUrl);
  } catch {
    imageError.value = "Kunde inte hämta produktbilder just nu.";
  } finally {
    imageLoading.value = false;
  }
}

async function selectImage(result: WineSearchResult): Promise<void> {
  if (!wine.value || !result.imageUrl) return;
  const saved = await store.updateWine({
    ...wine.value,
    image: result.imageUrl,
    systembolagetProductNumber:
      wine.value.systembolagetProductNumber ?? result.productNumber,
    systembolagetUrl: wine.value.systembolagetUrl ?? result.productUrl,
    updatedAt: new Date().toISOString(),
  });
  if (saved) modal.value = undefined;
}

function confirmDeleteTasting(tasting: Tasting): void {
  selectedTasting.value = tasting;
  modal.value = "deleteTasting";
}

async function deleteTasting(): Promise<void> {
  if (!selectedTasting.value) return;
  if (await store.deleteTasting(selectedTasting.value.id)) {
    selectedTasting.value = undefined;
    modal.value = undefined;
  }
}

async function deleteWine(): Promise<void> {
  if (wine.value && (await store.deleteWine(wine.value.id)))
    await router.push("/collection");
}
</script>

<template>
  <main v-if="wine" class="detail-page">
    <div class="detail-topbar">
      <RouterLink class="back-link" to="/collection"
        ><ArrowLeft :size="19" aria-hidden="true" /> Samling</RouterLink
      >
      <div class="detail-topbar__actions">
        <RouterLink
          class="icon-button"
          :to="`/wine/${wine.id}/edit`"
          aria-label="Redigera vin"
          title="Redigera"
          ><Edit3 :size="19" aria-hidden="true" /></RouterLink
        ><button
          class="icon-button icon-button--danger"
          type="button"
          aria-label="Ta bort vin"
          title="Ta bort vin"
          @click="modal = 'deleteWine'"
        >
          <Trash2 :size="19" aria-hidden="true" />
        </button>
      </div>
    </div>
    <header class="wine-detail-header">
      <div
        class="wine-visual"
        :class="`wine-visual--${wine.wineType.toLowerCase()}`"
        aria-hidden="true"
      >
        <WineImage
          :src="wine.image"
          :wine-type="wine.wineType"
          size="lg"
          :alt="`${wine.producer} ${wine.name}`"
        />
      </div>
      <div class="wine-detail-intro">
        <WineTypeBadge :type="wine.wineType" />
        <p class="eyebrow">{{ wine.producer }}</p>
        <h1>
          {{ wine.name }} <span v-if="wine.vintage">{{ wine.vintage }}</span>
        </h1>
        <p>
          {{
            [wine.appellation, wine.region, wine.country]
              .filter(Boolean)
              .join(" · ")
          }}
        </p>
        <div class="detail-status">
          <DrinkingStatusBadge :wine="wine" /><strong
            >{{ wine.quantity }}
            {{ wine.quantity === 1 ? "flaska" : "flaskor" }}</strong
          >
        </div>
      </div>
    </header>

    <div class="sticky-actions">
      <button
        class="button button-primary"
        type="button"
        :disabled="wine.quantity === 0"
        @click="modal = 'consume'"
      >
        <WineIcon :size="19" aria-hidden="true" /> Drick en</button
      ><button
        class="button button-secondary"
        type="button"
        @click="modal = 'add'"
      >
        <Plus :size="19" aria-hidden="true" /> Lägg till flaska
      </button>
    </div>

    <div class="detail-content">
      <section class="detail-section">
        <h2>Drick & lagra</h2>
        <div class="detail-grid">
          <div v-if="wine.drinkingWindowStart || wine.drinkingWindowEnd">
            <span>Drickfönster</span
            ><strong
              >{{ wine.drinkingWindowStart ?? "Nu" }}–{{
                wine.drinkingWindowEnd ?? "vidare"
              }}</strong
            >
          </div>
          <div v-if="wine.optimalDrinkingStart || wine.optimalDrinkingEnd">
            <span>Optimal period</span
            ><strong
              >{{ wine.optimalDrinkingStart ?? "Nu" }}–{{
                wine.optimalDrinkingEnd ?? "vidare"
              }}</strong
            >
          </div>
          <div>
            <span>Rekommendation</span
            ><strong>{{ getStorageRecommendation(wine) }}</strong>
          </div>
          <div v-if="wine.servingTemperatureMin || wine.servingTemperatureMax">
            <span>Servering</span
            ><strong
              >{{ wine.servingTemperatureMin ?? "–" }}–{{
                wine.servingTemperatureMax ?? "–"
              }}
              °C</strong
            >
          </div>
        </div>
      </section>
      <section class="detail-section">
        <div class="section-heading">
          <h2>Om vinet</h2>
          <div class="section-actions">
            <button class="text-button" type="button" @click="openImageLookup">
              <ImageIcon :size="16" aria-hidden="true" />{{
                wine.image ? "Byt bild" : "Hämta bild"
              }}</button
            ><button
              v-if="missingMetadata.length"
              class="text-button"
              type="button"
              :disabled="enrichmentStatus === 'PENDING'"
              @click="enrich"
            >
              <Sparkles :size="16" aria-hidden="true" />{{
                enrichmentStatus === "PENDING"
                  ? "Kompletterar vininfo…"
                  : enrichmentStatus === "FAILED"
                    ? "Komplettera igen"
                    : "Komplettera vininfo"
              }}
            </button>
          </div>
        </div>
        <p v-if="wine.description" class="lead-copy">{{ wine.description }}</p>
        <dl class="spec-list">
          <div v-if="wine.grapes.length">
            <dt>Druvor</dt>
            <dd>{{ wine.grapes.join(", ") }}</dd>
          </div>
          <div v-if="wine.region || wine.country">
            <dt>Region</dt>
            <dd>
              {{ [wine.region, wine.country].filter(Boolean).join(", ") }}
            </dd>
          </div>
          <div v-if="wine.foodPairings.length">
            <dt>Mat</dt>
            <dd>{{ wine.foodPairings.join(" · ") }}</dd>
          </div>
          <div v-if="wine.referencePrice">
            <dt>Referenspris</dt>
            <dd>{{ formatCurrency(wine.referencePrice, wine.currency) }}</dd>
          </div>
        </dl>
        <p v-if="enrichmentStatus === 'FAILED'" class="form-hint">
          Vinet är sparat, men informationen kunde inte kompletteras.
        </p>
        <p
          v-if="
            !wine.description &&
            !wine.grapes.length &&
            !wine.foodPairings.length
          "
          class="quiet-empty"
        >
          Detaljerad vinmetadata saknas och kan kompletteras senare.
        </p>
      </section>
      <section class="detail-section">
        <div class="section-heading">
          <h2>Mina flaskor</h2>
          <button class="text-button" type="button" @click="openCorrection">
            <MinusCircle :size="16" aria-hidden="true" /> Korrigera antal
          </button>
        </div>
        <div v-if="inventory.length" class="purchase-list">
          <div v-for="item in inventory" :key="item.id">
            <div>
              <strong
                >{{ item.quantity }} st ·
                {{ storageLocationLabels[item.storageLocation] }}</strong
              ><span
                >{{
                  item.purchaseDate
                    ? formatDate(item.purchaseDate)
                    : "Datum saknas"
                }}<template v-if="item.purchaseLocation">
                  · {{ item.purchaseLocation }}</template
                ></span
              >
            </div>
            <strong
              >{{
                formatCurrency(item.purchasePrice, item.currency)
              }}/st</strong
            >
          </div>
        </div>
        <p v-else>Inga flaskor i lager.</p>
      </section>
      <section class="detail-section">
        <div class="section-heading">
          <h2>Smaknoteringar</h2>
          <div v-if="averageRating" class="rating">
            <Star :size="17" fill="currentColor" aria-hidden="true" />
            {{ averageRating.toFixed(1) }}/5
          </div>
        </div>
        <p v-if="latestBuyAgain" class="buy-again">
          Köp igen: <strong>{{ buyLabels[latestBuyAgain] }}</strong>
        </p>
        <div v-if="tastings.length" class="tasting-list">
          <article v-for="tasting in tastings" :key="tasting.id">
            <div>
              <strong>{{ formatDate(tasting.date) }}</strong
              ><span v-if="tasting.rating" class="rating"
                ><Star :size="14" fill="currentColor" aria-hidden="true" />
                {{ tasting.rating }}/5</span
              ><button
                class="icon-button icon-button--danger"
                type="button"
                aria-label="Ta bort smaknotering"
                title="Ta bort smaknotering"
                @click="confirmDeleteTasting(tasting)"
              >
                <Trash2 :size="16" aria-hidden="true" />
              </button>
            </div>
            <p v-if="tasting.review">“{{ tasting.review }}”</p>
          </article>
        </div>
        <p v-else>Inga smaknoteringar ännu.</p>
      </section>
    </div>

    <ModalShell
      v-if="modal === 'consume'"
      title="Drick en flaska"
      @close="modal = undefined"
      ><ConsumeForm
        :wine="wine"
        :saving="store.isSaving.value"
        @submit="consume"
        @decrement="decrement"
    /></ModalShell>
    <ModalShell
      v-if="modal === 'add'"
      title="Lägg till flaskor"
      @close="modal = undefined"
      ><InventoryForm :saving="store.isSaving.value" @submit="add"
    /></ModalShell>
    <ModalShell
      v-if="modal === 'correct'"
      title="Korrigera antal"
      @close="modal = undefined"
      ><form class="form-stack" @submit.prevent="correct">
        <label class="field"
          ><span>Totalt antal flaskor</span
          ><input
            v-model.number="correctedQuantity"
            type="number"
            min="0"
            required
            inputmode="numeric"
        /></label>
        <p class="form-hint">Detta skapar ingen smaknotering.</p>
        <button
          class="button button-primary button-block"
          type="submit"
          :disabled="store.isSaving.value"
        >
          {{ store.isSaving.value ? "Sparar…" : "Spara antal" }}
        </button>
      </form></ModalShell
    >
    <ModalShell
      v-if="modal === 'image'"
      title="Välj produktbild"
      @close="modal = undefined"
      ><div class="form-stack">
        <p class="form-hint">
          Välj bara en träff som motsvarar rätt vin. Bild och produktlänk hämtas
          från Systembolaget.
        </p>
        <p v-if="imageLoading">Hämtar bilder…</p>
        <p v-else-if="imageError" class="form-error">{{ imageError }}</p>
        <div v-else-if="imageResults.length" class="search-results">
          <button
            v-for="result in imageResults"
            :key="result.externalId ?? result.productNumber"
            type="button"
            :disabled="store.isSaving.value"
            @click="selectImage(result)"
          >
            <WineImage
              :src="result.imageUrl"
              :wine-type="result.wineType"
              size="sm"
              :alt="`${result.producer ?? 'Vin'} ${result.name}`"
            /><span
              ><strong
                >{{ result.name }}
                <b v-if="result.vintage">{{ result.vintage }}</b></strong
              ><small
                >{{ result.producer
                }}<template v-if="result.productNumber">
                  · Nr {{ result.productNumber }}</template
                ></small
              ></span
            >
          </button>
        </div>
        <p v-else class="quiet-empty">
          Ingen produktbild hittades. Du kan ange en bildadress under Redigera
          vin.
        </p>
      </div></ModalShell
    >
    <ModalShell
      v-if="modal === 'deleteTasting'"
      title="Ta bort smaknotering?"
      @close="modal = undefined"
      ><div class="form-stack">
        <p>Smaknoteringen tas bort permanent. Flaskantalet ändras inte.</p>
        <button
          class="button button-danger button-block"
          type="button"
          :disabled="store.isSaving.value"
          @click="deleteTasting"
        >
          {{
            store.isSaving.value ? "Tar bort…" : "Ta bort smaknotering"
          }}</button
        ><button
          class="button button-secondary button-block"
          type="button"
          :disabled="store.isSaving.value"
          @click="modal = undefined"
        >
          Avbryt
        </button>
      </div></ModalShell
    >
    <ModalShell
      v-if="modal === 'deleteWine'"
      title="Ta bort vinet?"
      @close="modal = undefined"
      ><div class="form-stack">
        <p>
          <strong>{{ wine.producer }} {{ wine.name }}</strong> tas bort
          permanent tillsammans med flaskor, smaknoteringar och
          streckkodskopplingar.
        </p>
        <button
          class="button button-danger button-block"
          type="button"
          :disabled="store.isSaving.value"
          @click="deleteWine"
        >
          {{ store.isSaving.value ? "Tar bort…" : "Ta bort vin" }}</button
        ><button
          class="button button-secondary button-block"
          type="button"
          :disabled="store.isSaving.value"
          @click="modal = undefined"
        >
          Avbryt
        </button>
      </div></ModalShell
    >
  </main>
  <main v-else class="page">
    <div class="empty-state">
      <h1>Vinet hittades inte</h1>
      <RouterLink class="button button-primary" to="/collection"
        >Till samlingen</RouterLink
      >
    </div>
  </main>
</template>
