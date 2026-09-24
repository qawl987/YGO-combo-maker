<script setup>
import { computed } from 'vue'
import { ChevronDown } from '@lucide/vue'
import CardSlot from './CardSlot.vue'
import { actionOptions, roleOptions, useComboStore } from '../stores/combo'

const props = defineProps({
  step: { type: Object, required: true },
  stepIndex: { type: Number, required: true },
  direction: { type: String, required: true },
  rowHeight: { type: Number, required: true },
})

const emit = defineEmits(['open-menu'])
const store = useComboStore()

function mainSlot() {
  return { type: 'main', stepIndex: props.stepIndex }
}

function materialSlot(materialIndex) {
  return { type: 'material', stepIndex: props.stepIndex, materialIndex }
}

function chainSlot(chainIndex, field) {
  return { type: 'chain', stepIndex: props.stepIndex, chainIndex, field }
}

function chainTargetSlot(chainIndex, targetIndex) {
  return { type: 'chain', stepIndex: props.stepIndex, chainIndex, field: 'targetCard', targetIndex }
}

const materialOverlap = computed(() => {
  const count = props.step.materials.length
  if (count <= 1) return 0
  const overflow = count * store.subCardWidth - store.mainCardWidth
  return Math.max(0, Math.ceil(overflow / (count - 1)))
})

const chainCards = computed(() => props.step.chainEffects.flatMap((block, chainIndex) => [
  {
    key: `${block.id}-source`,
    card: block.sourceCard,
    label: '發動',
    slot: chainSlot(chainIndex, 'sourceCard'),
    startsBlock: chainIndex > 0,
  },
  ...block.targetCards.map((target, targetIndex) => ({
    key: target.id,
    card: target.card,
    label: '對象',
    slot: chainTargetSlot(chainIndex, targetIndex),
    startsBlock: false,
  })),
]))

const chainOverlap = computed(() => {
  const count = chainCards.value.length
  if (count <= 1) return 0
  const cardHeight = Math.round(store.subCardWidth * 1.45)
  const availableHeight = props.rowHeight - 12
  const separators = Math.max(0, props.step.chainEffects.length - 1) * 2
  const requiredOverlap = Math.ceil((count * cardHeight + separators - availableHeight) / (count - 1))
  return Math.max(Math.round(cardHeight / 3), requiredOverlap, 0)
})

function roleLabel(slot) {
  if (slot.role === 'CUSTOM') return slot.customRoleText || '自訂'
  return roleOptions.find((role) => role.value === slot.role)?.label || slot.role
}

function onContextMenu(event) {
  emit('open-menu', { event, kind: 'step', index: props.stepIndex })
}

function onSlotMenu({ event, slot }) {
  const kind = slot.type === 'material' ? 'material' : slot.type === 'chain' ? 'chain' : 'step'
  emit('open-menu', { event, kind, index: props.stepIndex, slot })
}
</script>

<template>
  <article
    class="step-node flex items-start gap-2"
    :class="direction === 'rtl' ? 'flex-row-reverse' : ''"
    :style="{ height: `${rowHeight}px` }"
  >
    <section
      class="relative shrink-0 rounded-md border border-zinc-300 bg-zinc-50 p-1.5 shadow-sm"
      :style="{ width: `${store.mainCardWidth + 14}px` }"
      @contextmenu.prevent.stop="onContextMenu"
    >
      <div class="export-hidden relative mb-2 h-7">
        <select
          v-if="step.actionType !== 'CUSTOM'"
          v-model="step.actionType"
          class="h-7 w-full rounded border border-zinc-300 bg-white px-1.5 text-[11px] font-semibold text-zinc-800"
        >
          <option v-for="option in actionOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <template v-else>
          <textarea
            v-model="step.customActionText"
            rows="2"
            class="h-7 w-full resize-none overflow-hidden rounded border border-zinc-900 bg-zinc-900 px-2 py-0.5 text-center text-xs font-bold leading-3 text-white outline-none [overflow-wrap:anywhere] focus:border-cyan-500"
            placeholder="自訂動作"
            title="自訂動作"
          />
          <select
            v-model="step.actionType"
            class="absolute inset-y-0 left-full z-20 ml-0.5 w-4 cursor-pointer opacity-0"
            title="變更動作"
          >
            <option v-for="option in actionOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <ChevronDown class="pointer-events-none absolute left-full top-2 ml-1 text-zinc-600" :size="12" />
        </template>
      </div>
      <div
        class="export-only mb-2 hidden h-7 overflow-hidden rounded border border-zinc-900 bg-zinc-900 text-white"
        :class="step.actionType === 'CUSTOM'
          ? 'items-center justify-center whitespace-pre-wrap px-2 py-0.5 text-center text-xs font-bold leading-3 [overflow-wrap:anywhere]'
          : 'items-center px-2 py-1 text-xs font-bold'"
      >
        {{ step.actionType === 'CUSTOM' ? (step.customActionText || '自訂') : actionOptions.find((item) => item.value === step.actionType)?.label }}
      </div>
      <CardSlot :card="step.mainCard" :slot="mainSlot()" label="主卡" size="main" @slot-menu="onSlotMenu" />

      <div
        class="absolute left-1.5 z-10 flex items-start"
        :style="{ top: `${Math.round(store.mainCardWidth * 1.24)}px`, width: `${store.mainCardWidth}px` }"
      >
        <div
          v-for="(slot, materialIndex) in step.materials"
          :key="slot.id"
          class="relative shrink-0"
          :style="{
            width: `${store.subCardWidth}px`,
            marginLeft: materialIndex === 0 ? '0' : `-${materialOverlap}px`,
            zIndex: materialIndex + 1,
          }"
        >
          <CardSlot :card="slot.card" :slot="materialSlot(materialIndex)" :label="roleLabel(slot)" size="small" @slot-menu="onSlotMenu" />
          <select
            v-if="slot.role !== 'CUSTOM'"
            v-model="slot.role"
            class="material-role-select export-hidden mt-1 h-6 w-full rounded border border-zinc-300 bg-white px-1 text-center text-[10px] font-semibold text-zinc-700"
          >
            <option v-for="option in roleOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <div v-else class="export-hidden mt-1 w-full">
            <textarea
              v-model="slot.customRoleText"
              rows="2"
              class="h-6 w-full resize-none overflow-hidden rounded border border-zinc-300 bg-white px-1 py-0.5 text-center text-[10px] font-semibold leading-[10px] text-zinc-700 outline-none [overflow-wrap:anywhere] focus:border-cyan-500"
              placeholder="自訂"
              title="自訂素材標籤"
            />
            <select
              v-model="slot.role"
              class="mt-0.5 h-4 w-full cursor-pointer rounded border border-zinc-300 bg-white px-0 text-center text-[8px] font-semibold text-zinc-600"
              title="變更素材標籤"
            >
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div
            v-if="slot.card"
            class="export-only mt-1 hidden h-6 w-full overflow-hidden rounded border border-zinc-300 bg-white py-0.5 pl-1 text-center font-semibold text-zinc-700"
            :class="slot.role === 'CUSTOM'
              ? 'items-center justify-center whitespace-pre-wrap px-1 text-[10px] leading-[10px] [overflow-wrap:anywhere]'
              : 'items-center justify-center px-1 text-[10px]'"
          >
            {{ roleLabel(slot) }}
          </div>
        </div>
      </div>

      <div :style="{ height: `${Math.round(store.subCardWidth * 0.82)}px` }" />
    </section>

    <section
      class="chain-zone relative flex shrink-0 flex-col items-center overflow-hidden px-1.5"
      :style="{ width: `${store.subCardWidth + 12}px`, height: `${rowHeight}px` }"
      @contextmenu.prevent.stop="emit('open-menu', { event: $event, kind: 'chain', index: stepIndex, slot: { type: 'chain', stepIndex, chainIndex: 0, field: 'sourceCard' } })"
    >
      <div
        v-for="(item, cardIndex) in chainCards"
        :key="item.key"
        class="chain-card relative shrink-0"
        :class="item.startsBlock ? 'chain-group-start' : ''"
        :style="{
          width: `${store.subCardWidth}px`,
          height: `${Math.round(store.subCardWidth * 1.45)}px`,
          marginTop: cardIndex === 0 ? '0' : `-${chainOverlap}px`,
          zIndex: cardIndex + 1,
        }"
      >
        <CardSlot :card="item.card" :slot="item.slot" :label="item.label" size="small" compact @slot-menu="onSlotMenu" />
      </div>
    </section>
  </article>
</template>
