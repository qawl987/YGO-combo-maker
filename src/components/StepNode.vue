<script setup>
import CardSlot from './CardSlot.vue'
import { actionOptions, roleOptions, useComboStore } from '../stores/combo'

const props = defineProps({
  step: { type: Object, required: true },
  stepIndex: { type: Number, required: true },
  direction: { type: String, required: true },
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
  <article class="step-node flex items-start gap-3" :class="direction === 'rtl' ? 'flex-row-reverse' : ''">
    <section class="relative shrink-0 rounded-lg border border-zinc-300 bg-zinc-50 p-1.5 shadow-sm" @contextmenu.prevent.stop="onContextMenu">
      <div class="export-hidden mb-2 flex items-center gap-2">
        <select v-model="step.actionType" class="h-7 min-w-16 rounded border border-zinc-300 bg-white px-1.5 text-[11px] font-semibold text-zinc-800">
          <option v-for="option in actionOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input
          v-if="step.actionType === 'CUSTOM'"
          v-model="step.customActionText"
          class="h-7 w-20 rounded border border-zinc-300 px-2 text-xs"
          placeholder="動作"
        >
      </div>
      <div class="export-only mb-2 hidden h-8 items-center rounded bg-zinc-900 px-2 text-xs font-bold text-white">
        {{ step.actionType === 'CUSTOM' ? (step.customActionText || '自訂') : actionOptions.find((item) => item.value === step.actionType)?.label }}
      </div>
      <CardSlot :card="step.mainCard" :slot="mainSlot()" label="主卡" size="main" @slot-menu="onSlotMenu" />

      <div
        class="absolute left-1/2 z-10 flex -translate-x-1/2 items-start justify-center -space-x-3"
        :style="{ top: `${Math.round(store.mainCardWidth * 1.24)}px` }"
      >
        <div v-for="(slot, materialIndex) in step.materials" :key="slot.id" class="relative">
          <CardSlot :card="slot.card" :slot="materialSlot(materialIndex)" :label="roleLabel(slot)" size="small" @slot-menu="onSlotMenu" />
          <select
            v-model="slot.role"
            class="export-hidden mt-1 h-6 w-full rounded border border-zinc-300 bg-white px-1 text-[10px] font-semibold text-zinc-700"
          >
            <option v-for="option in roleOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <input
            v-if="slot.role === 'CUSTOM'"
            v-model="slot.customRoleText"
            class="export-hidden mt-1 h-6 w-full rounded border border-zinc-300 px-1 text-[10px]"
            placeholder="標籤"
          >
        </div>
      </div>

      <div :style="{ height: `${Math.round(store.subCardWidth * 0.82)}px` }" />
    </section>

    <section
      class="chain-zone relative flex min-h-36 shrink-0 items-start gap-2 rounded-lg border border-dashed border-zinc-300 bg-white/70 p-2"
      :style="{ minWidth: `${store.project.gridSettings.gapColumnWidth + store.subCardWidth + 16}px` }"
      @contextmenu.prevent.stop="emit('open-menu', { event: $event, kind: 'chain', index: stepIndex, slot: { type: 'chain', stepIndex, chainIndex: 0, field: 'sourceCard' } })"
    >
      <div
        v-for="(block, chainIndex) in step.chainEffects"
        :key="block.id"
        class="relative flex flex-col items-center rounded-md bg-zinc-100 p-1"
      >
        <CardSlot :card="block.sourceCard" :slot="chainSlot(chainIndex, 'sourceCard')" label="發動" size="small" compact @slot-menu="onSlotMenu" />
        <div class="flex flex-col items-center">
          <CardSlot
            v-for="(target, targetIndex) in block.targetCards"
            :key="target.id"
            :card="target.card"
            :slot="chainTargetSlot(chainIndex, targetIndex)"
            label="對象"
            size="small"
            compact
            :style="{ marginTop: `-${Math.round(store.subCardWidth * 1.45 / 3)}px` }"
            @slot-menu="onSlotMenu"
          />
        </div>
      </div>
      <div class="pointer-events-none absolute inset-y-1/2 h-px w-full -translate-y-1/2 bg-zinc-300" />
    </section>
  </article>
</template>
