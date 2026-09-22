<script setup>
import { ref } from 'vue'
import { Download, FileDown, FileUp, ImageDown, Plus, RotateCcw, Search } from '@lucide/vue'
import { useComboStore } from '../stores/combo'

defineProps({
  exporting: { type: Boolean, default: false },
})

const emit = defineEmits(['export-json', 'import-json', 'export-png'])
const store = useComboStore()
const passcode = ref('')
const fileInput = ref(null)

async function addCard() {
  try {
    await store.addCardByPasscode(passcode.value)
    passcode.value = ''
  } catch (error) {
    store.setStatus(error.message)
  }
}

function dragCard(event, card) {
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('application/json', JSON.stringify(card))
  store.selectCard(card)
}

function triggerImport() {
  fileInput.value?.click()
}
</script>

<template>
  <aside class="flex h-full w-80 shrink-0 flex-col border-r border-zinc-200 bg-white">
    <div class="border-b border-zinc-200 p-4">
      <div class="mb-4">
        <p class="text-xs font-bold uppercase text-cyan-700">Deck Lab</p>
        <h2 class="text-xl font-black text-zinc-950">展開一圖流</h2>
      </div>

      <label class="text-xs font-bold text-zinc-600">專案名稱</label>
      <input v-model="store.project.title" class="mt-1 h-10 w-full rounded-md border border-zinc-300 px-3 text-sm font-semibold" />

      <div class="mt-4 grid grid-cols-3 gap-2">
        <label class="text-xs font-bold text-zinc-600">
          每列
          <input v-model.number="store.project.gridSettings.columnsPerRow" min="2" max="6" type="number" class="mt-1 h-9 w-full rounded border border-zinc-300 px-2">
        </label>
        <label class="text-xs font-bold text-zinc-600">
          主卡
          <input v-model.number="store.project.gridSettings.mainCardWidth" min="110" max="190" type="number" class="mt-1 h-9 w-full rounded border border-zinc-300 px-2">
        </label>
        <label class="text-xs font-bold text-zinc-600">
          間距
          <input v-model.number="store.project.gridSettings.gapColumnWidth" min="40" max="180" type="number" class="mt-1 h-9 w-full rounded border border-zinc-300 px-2">
        </label>
      </div>
    </div>

    <div class="border-b border-zinc-200 p-4">
      <label class="text-xs font-bold text-zinc-600">卡片密碼</label>
      <form class="mt-1 flex gap-2" @submit.prevent="addCard">
        <div class="relative flex-1">
          <Search class="pointer-events-none absolute left-2 top-2.5 text-zinc-400" :size="16" />
          <input v-model="passcode" inputmode="numeric" maxlength="8" class="h-10 w-full rounded-md border border-zinc-300 pl-8 pr-2 text-sm" placeholder="89631139">
        </div>
        <button class="inline-flex h-10 items-center gap-1 rounded-md bg-zinc-950 px-3 text-sm font-bold text-white hover:bg-zinc-800" :disabled="store.isLoadingCard">
          <Plus :size="16" /> 新增
        </button>
      </form>
      <p class="mt-2 h-4 text-xs font-medium text-cyan-700">{{ store.statusMessage }}</p>
    </div>

    <div class="min-h-0 flex-1 overflow-auto p-4">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-black text-zinc-900">素材庫</h3>
        <span class="text-xs font-semibold text-zinc-500">{{ store.project.library.length }} 張</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="card in store.project.library"
          :key="card.passcode"
          class="group overflow-hidden rounded-md border bg-zinc-100 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-500"
          :class="store.selectedCard?.passcode === card.passcode ? 'border-cyan-500 ring-2 ring-cyan-200' : 'border-zinc-200'"
          draggable="true"
          @click="store.selectCard(card)"
          @dragstart="dragCard($event, card)"
        >
          <img :src="card.imageUrl" :alt="card.passcode" class="aspect-[0.69] w-full object-cover" draggable="false">
          <span class="block truncate px-1 py-1 text-[10px] font-bold text-zinc-700">{{ card.customName || card.passcode }}</span>
        </button>
      </div>
    </div>

    <div class="space-y-2 border-t border-zinc-200 p-4">
      <button class="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 text-sm font-bold text-white hover:bg-cyan-800" :disabled="exporting" @click="emit('export-png')">
        <ImageDown :size="16" /> 匯出 PNG
      </button>
      <div class="grid grid-cols-2 gap-2">
        <button class="flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 text-sm font-bold hover:bg-zinc-100" @click="emit('export-json')">
          <FileDown :size="16" /> JSON
        </button>
        <button class="flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 text-sm font-bold hover:bg-zinc-100" @click="triggerImport">
          <FileUp :size="16" /> 匯入
        </button>
      </div>
      <button class="flex h-9 w-full items-center justify-center gap-2 rounded-md text-xs font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" @click="store.resetProject">
        <RotateCcw :size="14" /> 空白專案
      </button>
      <input ref="fileInput" class="hidden" type="file" accept="application/json,.json" @change="emit('import-json', $event)">
    </div>
  </aside>
</template>
