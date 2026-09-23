<script setup>
import { nextTick, ref } from 'vue'
import {
  Copy,
  FileDown,
  FileUp,
  ImageDown,
  LayoutDashboard,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
} from '@lucide/vue'
import { useComboStore } from '../stores/combo'

defineProps({
  exporting: { type: Boolean, default: false },
})

const emit = defineEmits(['export-json', 'import-json', 'export-png'])
const store = useComboStore()
const passcode = ref('')
const fileInput = ref(null)
const settingsOpen = ref(false)
const managerOpen = ref(false)
const flowMenu = ref(null)
const editingFlowId = ref(null)
const editingFlowTitle = ref('')
const renameInput = ref(null)

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

function toggleManager() {
  managerOpen.value = !managerOpen.value
  settingsOpen.value = false
  flowMenu.value = null
}

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value
  flowMenu.value = null
}

function openFlowMenu(event, flow) {
  flowMenu.value = { flow, x: event.clientX, y: event.clientY }
}

function closeFlowMenu() {
  flowMenu.value = null
}

async function selectFlow(flow) {
  if (editingFlowId.value) return
  closeFlowMenu()
  await store.loadSavedFlow(flow.id)
}

async function beginRename(flow) {
  editingFlowId.value = flow.id
  editingFlowTitle.value = flow.title
  closeFlowMenu()
  await nextTick()
  const input = Array.isArray(renameInput.value) ? renameInput.value[0] : renameInput.value
  input?.focus()
  input?.select()
}

function finishRename() {
  if (!editingFlowId.value) return
  store.renameSavedFlow(editingFlowId.value, editingFlowTitle.value)
  editingFlowId.value = null
  editingFlowTitle.value = ''
}

function cancelRename() {
  editingFlowId.value = null
  editingFlowTitle.value = ''
}

function removeFlow(flow) {
  closeFlowMenu()
  if (window.confirm(`刪除「${flow.title}」？`)) store.deleteSavedFlow(flow.id)
}

function clearLibrary() {
  if (window.confirm('清空整個素材庫？已放入畫布的卡片不會受影響。')) store.clearLibrary()
}
</script>

<template>
  <aside class="flex h-full w-80 shrink-0 flex-col border-r border-zinc-200 bg-white" @click="closeFlowMenu">
    <div class="border-b border-zinc-200 p-4">
      <p class="text-xs font-bold uppercase text-cyan-700">Deck Lab</p>
      <h2 class="text-xl font-black text-zinc-950">展開一圖流</h2>
    </div>

    <template v-if="!managerOpen">
      <div class="px-4 pb-1 pt-4">
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
        <p class="mt-1 h-4 text-xs font-medium text-cyan-700">{{ store.statusMessage }}</p>
      </div>

      <div class="min-h-0 flex-1 overflow-auto px-4 pb-4 pt-2">
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
    </template>

    <template v-else>
      <div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div>
          <h3 class="text-sm font-black text-zinc-900">一圖管理</h3>
          <p class="text-xs font-semibold text-zinc-500">{{ store.savedFlows.length }} 個畫布</p>
        </div>
        <button class="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-700 text-white hover:bg-cyan-800" title="新增空白畫布" @click.stop="store.createBlankFlow">
          <Plus :size="18" />
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-auto p-4">
        <div v-if="store.savedFlows.length" class="space-y-2">
          <div
            v-for="flow in store.savedFlows"
            :key="flow.id"
            class="flex h-12 w-full items-center justify-center rounded-md border px-3 text-center text-sm font-bold transition"
            :class="store.activeSavedFlowId === flow.id
              ? 'border-cyan-700 bg-cyan-700 text-white shadow-sm'
              : 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500 hover:bg-zinc-50'"
            @click.stop="selectFlow(flow)"
            @contextmenu.prevent.stop="openFlowMenu($event, flow)"
            @keydown.enter.prevent="selectFlow(flow)"
            role="button"
            tabindex="0"
          >
            <input
              v-if="editingFlowId === flow.id"
              ref="renameInput"
              v-model="editingFlowTitle"
              class="h-8 w-full rounded border border-cyan-300 bg-white px-2 text-center text-sm font-bold text-zinc-900 outline-none"
              @click.stop
              @blur="finishRename"
              @keydown.enter.prevent.stop="finishRename"
              @keydown.escape.prevent.stop="cancelRename"
            >
            <span v-else class="truncate">{{ flow.title }}</span>
          </div>
        </div>
        <div v-else class="flex h-36 items-center justify-center border-y border-zinc-200 text-center text-sm font-semibold text-zinc-400">
          尚未儲存任何畫布
        </div>
        <p class="mt-3 h-4 text-xs font-medium text-cyan-700">{{ store.statusMessage }}</p>
      </div>
    </template>

    <div class="relative border-t border-zinc-200 p-4">
      <div class="flex gap-2">
        <button class="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 shadow-sm hover:bg-zinc-100" title="設定" @click.stop="toggleSettings">
          <Settings :size="18" />
        </button>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-md border shadow-sm transition"
          :class="managerOpen ? 'border-cyan-700 bg-cyan-700 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'"
          title="一圖管理"
          @click.stop="toggleManager"
        >
          <LayoutDashboard :size="18" />
        </button>
      </div>

      <div v-if="settingsOpen" class="absolute bottom-16 left-4 z-30 w-72 rounded-lg border border-zinc-200 bg-white p-4 shadow-2xl" @click.stop>
        <div class="grid grid-cols-2 gap-2">
          <label class="text-xs font-bold text-zinc-600">
            每列
            <input v-model.number="store.project.gridSettings.columnsPerRow" min="2" max="6" type="number" class="mt-1 h-9 w-full rounded border border-zinc-300 px-2">
          </label>
          <label class="text-xs font-bold text-zinc-600">
            主卡
            <input v-model.number="store.project.gridSettings.mainCardWidth" min="72" max="180" type="number" class="mt-1 h-9 w-full rounded border border-zinc-300 px-2">
          </label>
        </div>

        <div class="mt-4 space-y-2">
          <button class="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 text-sm font-bold text-white hover:bg-cyan-800" :disabled="exporting" @click="emit('export-png')">
            <ImageDown :size="16" /> 匯出 PNG
          </button>
          <div class="grid grid-cols-2 gap-2">
            <button class="flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 text-sm font-bold hover:bg-zinc-100" @click="emit('export-json')">
              <FileDown :size="16" /> 匯出 JSON
            </button>
            <button class="flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 text-sm font-bold hover:bg-zinc-100" @click="triggerImport">
              <FileUp :size="16" /> 匯入 JSON
            </button>
            <button class="flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50" @click="clearLibrary">
              <Trash2 :size="15" /> 清空素材庫
            </button>
          </div>
        </div>
      </div>
      <input ref="fileInput" class="hidden" type="file" accept="application/json,.json" @change="emit('import-json', $event)">
    </div>

    <div
      v-if="flowMenu"
      class="fixed z-50 w-44 overflow-hidden rounded-md border border-zinc-200 bg-white py-1 text-sm shadow-xl"
      :style="{ left: `${flowMenu.x}px`, top: `${flowMenu.y}px` }"
      @click.stop
    >
      <button class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100" @click="store.duplicateSavedFlow(flowMenu.flow.id); closeFlowMenu()">
        <Copy :size="15" /> 複製畫布
      </button>
      <button class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100" @click="beginRename(flowMenu.flow)">
        <Pencil :size="15" /> 修改一圖名
      </button>
      <button class="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-700 hover:bg-rose-50" @click="removeFlow(flowMenu.flow)">
        <Trash2 :size="15" /> 刪除畫布
      </button>
    </div>
  </aside>
</template>
