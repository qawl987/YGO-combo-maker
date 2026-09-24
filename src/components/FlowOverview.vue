<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import CardSlot from './CardSlot.vue'
import { useComboStore } from '../stores/combo'

const emit = defineEmits(['open-menu'])
const store = useComboStore()
const noteInput = ref(null)

const groups = [
  { key: 'starters', label: '起手' },
  { key: 'garnets', label: '廢件' },
  { key: 'endBoard', label: '終場' },
]

function overviewSlot(group, slotIndex) {
  return { type: 'overview', group, slotIndex }
}

function openMenu(event, group, slotIndex = null) {
  emit('open-menu', {
    event,
    kind: 'overview',
    slot: { type: 'overview', group, slotIndex },
  })
}

function resizeNote() {
  const input = Array.isArray(noteInput.value) ? noteInput.value[0] : noteInput.value
  if (!input) return
  input.style.height = 'auto'
  input.style.height = `${Math.max(32, input.scrollHeight + 2)}px`
}

watch(
  () => store.project.overview.endBoardNote,
  () => nextTick(resizeNote),
  { flush: 'post' },
)

onMounted(resizeNote)
</script>

<template>
  <div class="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-2 px-2 py-1">
    <section
      v-for="group in groups"
      :key="group.key"
      class="flex items-center gap-1.5"
      @contextmenu.prevent.stop="openMenu($event, group.key)"
    >
      <span class="shrink-0 text-[11px] font-black text-zinc-700">{{ group.label }}:</span>
      <div class="flex items-center gap-0.5">
        <CardSlot
          v-for="(slot, slotIndex) in store.project.overview[group.key]"
          :key="slot.id"
          :card="slot.card"
          :slot="overviewSlot(group.key, slotIndex)"
          :label="group.label"
          size="overview"
          compact
          @slot-menu="({ event }) => openMenu(event, group.key, slotIndex)"
        />
        <button
          v-if="store.project.overview[group.key].length === 0"
          class="export-hidden flex h-[52px] w-9 items-center justify-center rounded border border-dashed border-zinc-300 text-sm font-bold text-zinc-400 hover:border-cyan-500 hover:text-cyan-700"
          :title="`右鍵新增${group.label}卡格`"
          @contextmenu.prevent.stop="openMenu($event, group.key)"
        >
          +
        </button>
      </div>
      <template v-if="group.key === 'endBoard'">
        <textarea
          ref="noteInput"
          v-model="store.project.overview.endBoardNote"
          rows="1"
          class="export-hidden min-h-8 w-32 resize-none overflow-hidden rounded border border-zinc-300 bg-white px-2 py-1.5 text-center text-xs font-semibold leading-4 text-zinc-800 outline-none [overflow-wrap:anywhere] focus:border-cyan-600"
          placeholder="例：4干擾"
          aria-label="終場備註"
          @input="resizeNote"
        />
        <span
          v-if="store.project.overview.endBoardNote"
          class="export-only hidden min-h-8 w-32 shrink-0 items-center justify-center whitespace-pre-wrap border border-transparent px-2 py-1.5 text-center text-xs font-semibold leading-4 text-zinc-700 [overflow-wrap:anywhere]"
        >
          {{ store.project.overview.endBoardNote }}
        </span>
      </template>
    </section>
  </div>
</template>
