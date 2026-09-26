<script setup lang="ts">
import { ref } from 'vue'
import type { BuyAgain, ConsumeInput, MaturityAssessment, Tasting, Wine } from '@/types/domain'
import { todayIso } from '@/utils/format'
import WineServingGuide from './WineServingGuide.vue'

const props = withDefaults(defineProps<{ wine: Wine; saving?: boolean }>(), { saving: false })
const emit = defineEmits<{ submit: [input: ConsumeInput] }>()
const date = ref(todayIso())
const rating = ref<Tasting['rating']>()
const review = ref('')
const maturityAssessment = ref<MaturityAssessment>()
const buyAgain = ref<BuyAgain>()

function save(): void {
  if (props.saving) return
  emit('submit', { date: date.value, rating: rating.value, review: review.value, maturityAssessment: maturityAssessment.value, buyAgain: buyAgain.value })
}
</script>

<template>
  <form class="form-stack" @submit.prevent="save">
    <WineServingGuide :wine="wine" />
    <label class="field"><span>Datum</span><input v-model="date" type="date" required /></label>
    <fieldset class="choice-field"><legend>Betyg <small>valfritt</small></legend><div class="rating-row"><button v-for="score in 5" :key="score" type="button" :class="{ selected: rating === score }" :aria-label="`${score} av 5`" @click="rating = score as Tasting['rating']">{{ score }}</button></div></fieldset>
    <label class="field"><span>Kort omdöme <small>valfritt</small></span><textarea v-model="review" rows="3" placeholder="Vad tyckte du?" /></label>
    <label class="field"><span>Mognad <small>valfritt</small></span><select v-model="maturityAssessment"><option :value="undefined">Välj mognad</option><option value="TOO_YOUNG">För ung</option><option value="GOOD_NOW">Bra nu</option><option value="PERFECT">Perfekt</option><option value="DECLINING">På väg utför</option></select></label>
    <fieldset class="choice-field"><legend>Köp igen? <small>valfritt</small></legend><div class="segmented"><button type="button" :class="{ selected: buyAgain === 'YES' }" @click="buyAgain = 'YES'">Ja</button><button type="button" :class="{ selected: buyAgain === 'MAYBE' }" @click="buyAgain = 'MAYBE'">Kanske</button><button type="button" :class="{ selected: buyAgain === 'NO' }" @click="buyAgain = 'NO'">Nej</button></div></fieldset>
    <p class="form-hint">Betyg och omdöme kan hoppas över.</p>
    <button class="button button-primary button-block" type="submit" :disabled="props.saving">{{ props.saving ? 'Sparar…' : 'Registrera som drucken' }}</button>
  </form>
</template>
