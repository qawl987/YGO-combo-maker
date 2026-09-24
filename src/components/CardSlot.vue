<script setup>
import { computed } from 'vue'
import { Copy, X } from '@lucide/vue'
import { useComboStore } from '../stores/combo'

const props = defineProps({
  card: { type: Object, default: null },
  slot: { type: Object, required: true },
  size: { type: String, default: 'main' },
  label: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['slot-menu'])
const store = useComboStore()

const dimensions = computed(() => {
  const width = props.size === 'main'
    ? store.mainCardWidth
    : props.size === 'overview' ? 36 : store.subCardWidth
  return {
    width: `${width}px`,
    height: `${Math.round(width * 1.45)}px`,
  }
})

const isActive = computed(() => {
  const active = store.activeSlot
  return JSON.stringify(active) === JSON.stringify(props.slot)
})

function onDragStart(event) {
  if (!props.card) return
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('application/json', JSON.stringify(props.card))
}

function onDrop(event) {
  const raw = event.dataTransfer.getData('application/json')
  if (!raw) return
  store.setSlotCard(props.slot, JSON.parse(raw))
  store.focusSlot(props.slot)
}

function onClick() {
  store.focusSlot(props.slot)
  if (props.card) {
    store.selectCard(props.card)
    return
  }
  if (store.selectedCard) {
    store.setSlotCard(props.slot, store.selectedCard)
  }
}

function onContextMenu(event) {
  emit('slot-menu', { event, slot: props.slot })
}
</script>

<template>
  <button
    class="group relative block shrink-0 overflow-hidden rounded-md border bg-white text-left shadow-sm transition"
    :class="[
      isActive ? 'border-cyan-500 ring-2 ring-cyan-300' : 'border-zinc-300 hover:border-zinc-500',
      size === 'main' ? 'card-slot-main' : size === 'overview' ? 'card-slot-overview' : 'card-slot-small',
      !card ? 'is-empty' : '',
      compact ? 'shadow-none' : '',
    ]"
    :style="dimensions"
    draggable="true"
    @click="onClick"
    @dragstart="onDragStart"
    @dragover.prevent
    @drop.prevent="onDrop"
    @contextmenu.prevent.stop="onContextMenu"
  >
    <img
      v-if="card"
      :src="card.imageUrl"
      :alt="card.customName || card.passcode"
      class="pointer-events-none h-full w-full object-cover"
      draggable="false"
    >
    <span v-else class="empty-slot-label pointer-events-none flex h-full w-full items-center justify-center bg-zinc-100 px-2 text-center text-[11px] font-medium text-zinc-500">
      {{ label || '放入卡片' }}
    </span>
    <span
      v-if="card"
      class="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 px-1.5 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100"
    >
      <span>{{ card.customName || card.passcode }}</span>
      <Copy :size="12" />
    </span>
    <span
      v-if="card"
      class="export-hidden absolute right-1 top-1 hidden rounded bg-white/90 p-0.5 text-zinc-700 shadow group-hover:block"
      @click.stop="store.setSlotCard(slot, null)"
    >
      <X :size="13" />
    </span>
  </button>
</template>
