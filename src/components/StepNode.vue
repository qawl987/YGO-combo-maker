<script setup>
import { Plus, Trash2 } from '@lucide/vue'
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

function roleLabel(slot) {
  if (slot.role === 'CUSTOM') return slot.customRoleText || '自訂'
  return roleOptions.find((role) => role.value === slot.role)?.label || slot.role
}

function onContextMenu(event) {
  emit('open-menu', { event, index: props.stepIndex })
}
</script>

<template>
  <article class="step-node flex items-start gap-4" :class="direction === 'rtl' ? 'flex-row-reverse' : ''" @contextmenu.prevent="onContextMenu">
    <section class="relative shrink-0 rounded-lg border border-zinc-300 bg-zinc-50 p-2 shadow-sm">
      <div class="export-hidden mb-2 flex items-center gap-2">
        <select v-model="step.actionType" class="h-8 min-w-20 rounded border border-zinc-300 bg-white px-2 text-xs font-semibold text-zinc-800">
          <option v-for="option in actionOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input
          v-if="step.actionType === 'CUSTOM'"
          v-model="step.customActionText"
          class="h-8 w-24 rounded border border-zinc-300 px-2 text-xs"
          placeholder="動作"
        >
      </div>
      <div class="export-only mb-2 hidden h-8 items-center rounded bg-zinc-900 px-2 text-xs font-bold text-white">
        {{ step.actionType === 'CUSTOM' ? (step.customActionText || '自訂') : actionOptions.find((item) => item.value === step.actionType)?.label }}
      </div>
      <CardSlot :card="step.mainCard" :slot="mainSlot()" label="主卡" size="main" />

      <div class="absolute left-1/2 top-[178px] z-10 flex -translate-x-1/2 items-start justify-center -space-x-3">
        <div v-for="(slot, materialIndex) in step.materials" :key="slot.id" class="relative">
          <CardSlot :card="slot.card" :slot="materialSlot(materialIndex)" :label="roleLabel(slot)" size="small" />
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
          <button
            v-if="step.materials.length > 1"
            class="export-hidden absolute -right-1 -top-1 rounded-full bg-rose-600 p-0.5 text-white opacity-0 shadow transition hover:bg-rose-700 group-hover:opacity-100"
            @click="store.removeMaterialSlot(stepIndex, materialIndex)"
            title="移除素材槽"
          >
            <Trash2 :size="11" />
          </button>
        </div>
      </div>

      <button
        v-if="step.materials.length < 5"
        class="export-hidden mt-20 inline-flex h-7 items-center gap-1 rounded border border-dashed border-zinc-400 px-2 text-[11px] font-semibold text-zinc-600 hover:border-zinc-700 hover:text-zinc-900"
        @click="store.addMaterialSlot(stepIndex)"
      >
        <Plus :size="13" /> 素材槽
      </button>
      <div v-else class="h-20" />
    </section>

    <section
      class="chain-zone relative grid min-h-[222px] shrink-0 grid-cols-2 gap-2 rounded-lg border border-dashed border-zinc-300 bg-white/70 p-2"
      :style="{ width: `${store.project.gridSettings.gapColumnWidth + store.subCardWidth * 2 + 28}px` }"
    >
      <div
        v-for="(block, chainIndex) in step.chainEffects"
        :key="block.id"
        class="relative flex flex-col items-center gap-1 rounded-md bg-zinc-100 p-1"
      >
        <CardSlot :card="block.sourceCard" :slot="chainSlot(chainIndex, 'sourceCard')" label="發動" size="small" />
        <CardSlot :card="block.targetCard" :slot="chainSlot(chainIndex, 'targetCard')" label="目標" size="small" />
        <button
          class="export-hidden absolute -right-1 -top-1 rounded-full bg-rose-600 p-0.5 text-white shadow hover:bg-rose-700"
          @click="store.removeChainBlock(stepIndex, chainIndex)"
          title="移除連鎖"
        >
          <Trash2 :size="11" />
        </button>
      </div>
      <button
        v-if="step.chainEffects.length < 4"
        class="export-hidden flex min-h-24 items-center justify-center rounded-md border border-dashed border-zinc-400 text-xs font-semibold text-zinc-500 hover:border-cyan-600 hover:text-cyan-700"
        @click="store.addChainBlock(stepIndex)"
      >
        <Plus :size="16" /> 連鎖
      </button>
      <div class="pointer-events-none absolute inset-y-1/2 h-px w-full -translate-y-1/2 bg-zinc-300" />
    </section>
  </article>
</template>
