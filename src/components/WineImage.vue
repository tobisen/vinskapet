<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { WineType } from "@/types/domain";
import { normalizeWineImageUrl } from "@/utils/wineImage";

const props = withDefaults(
  defineProps<{
    src?: string;
    wineType?: WineType;
    alt?: string;
    size?: "sm" | "md" | "lg";
  }>(),
  {
    alt: "Vinbild",
    size: "md",
  },
);

const hasError = ref(false);

watch(
  () => props.src,
  () => {
    hasError.value = false;
  },
  { immediate: true },
);

const normalizedSrc = computed(() =>
  props.src && !hasError.value ? normalizeWineImageUrl(props.src) : undefined,
);

const placeholderLabel = computed(() => {
  const labels: Record<WineType, string> = {
    RED: "R",
    WHITE: "W",
    ROSE: "R",
    SPARKLING_WHITE: "M",
    SPARKLING_ROSE: "M",
    ORANGE: "O",
    DESSERT: "D",
    FORTIFIED: "S",
  };
  return labels[props.wineType ?? "RED"] ?? "W";
});
</script>

<template>
  <div
    class="wine-image"
    :class="[
      `wine-image--${size}`,
      `wine-image--${(wineType ?? 'RED').toLowerCase()}`,
      { 'wine-image--loaded': normalizedSrc },
    ]"
  >
    <img
      v-if="normalizedSrc"
      :src="normalizedSrc"
      :alt="alt"
      @error="hasError = true"
    />
    <div v-else class="wine-image__placeholder" aria-hidden="true">
      <span>{{ placeholderLabel }}</span>
    </div>
  </div>
</template>
