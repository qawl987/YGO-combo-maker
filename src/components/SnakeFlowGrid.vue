<script setup>
import { computed, nextTick, ref } from 'vue'
import { ArrowLeft, ArrowRight, RotateCcw, ZoomIn } from '@lucide/vue'
import StepNode from './StepNode.vue'
import FlowOverview from './FlowOverview.vue'
import { useComboStore } from '../stores/combo'

const store = useComboStore()
const canvasRef = ref(null)
const viewportRef = ref(null)
const contextMenu = ref(null)
const zoom = ref(1)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0, left: 0, top: 0 })
const editingTitle = ref(false)
const titleInputRef = ref(null)
const originalTitle = ref('')

defineExpose({ canvasRef })

const stepCellWidth = computed(() => store.mainCardWidth + store.subCardWidth + 34)
const chainColumnWidth = computed(() => store.subCardWidth + 12)
const rowEdgePadding = computed(() => chainColumnWidth.value + 8)
const displayColumnCount = computed(() => Math.max(
  1,
  Math.min(store.columnsPerRow, store.project.steps.length),
))
const flowWidth = computed(() => (
  rowEdgePadding.value
  + displayColumnCount.value * stepCellWidth.value
  + Math.max(0, displayColumnCount.value - 1) * 12
))
const canvasWidth = computed(() => flowWidth.value + 40)
const rowHeight = computed(() => Math.max(
  Math.round(store.mainCardWidth * 1.45 + store.subCardWidth * 0.82 + 54),
  Math.round(store.subCardWidth * 3.5),
))

const rows = computed(() => {
  const rowSize = store.columnsPerRow
  const chunks = []
  for (let start = 0; start < store.project.steps.length; start += rowSize) {
    const rowIndex = Math.floor(start / rowSize)
    const direction = rowIndex % 2 === 0 ? 'ltr' : 'rtl'
    const items = store.project.steps.slice(start, start + rowSize).map((step, offset) => ({
      step,
      index: start + offset,
    }))
    const visualItems = direction === 'ltr' ? items : [...items].reverse()
    const cells = Array.from({ length: displayColumnCount.value }, () => null)
    const offset = direction === 'rtl' ? displayColumnCount.value - visualItems.length : 0
    visualItems.forEach((item, itemIndex) => {
      cells[offset + itemIndex] = item
    })
    chunks.push({ rowIndex, direction, cells })
  }
  return chunks
})

function openContextMenu({ event, kind, index, slot }) {
  contextMenu.value = {
    kind,
    index,
    slot,
    x: event.clientX,
    y: event.clientY,
  }
}

function closeContextMenu() {
  contextMenu.value = null
}

function runContextAction(action) {
  if (!contextMenu.value) return
  const payload = contextMenu.value
  closeContextMenu()
  action(payload)
}

function onWheel(event) {
  if (!event.ctrlKey && !event.metaKey) return
  event.preventDefault()
  const delta = event.deltaY > 0 ? -0.08 : 0.08
  zoom.value = Math.min(1.8, Math.max(0.35, Number((zoom.value + delta).toFixed(2))))
}

function onPointerDown(event) {
  if (event.button !== 1) return
  event.preventDefault()
  isPanning.value = true
  panStart.value = {
    x: event.clientX,
    y: event.clientY,
    left: viewportRef.value.scrollLeft,
    top: viewportRef.value.scrollTop,
  }
  viewportRef.value.setPointerCapture(event.pointerId)
}

function onPointerMove(event) {
  if (!isPanning.value) return
  viewportRef.value.scrollLeft = panStart.value.left - (event.clientX - panStart.value.x)
  viewportRef.value.scrollTop = panStart.value.top - (event.clientY - panStart.value.y)
}

function onPointerUp(event) {
  if (!isPanning.value) return
  isPanning.value = false
  viewportRef.value.releasePointerCapture(event.pointerId)
}

function resetZoom() {
  zoom.value = 1
}

async function startTitleEdit() {
  originalTitle.value = store.project.title
  editingTitle.value = true
  await nextTick()
  titleInputRef.value?.focus()
  titleInputRef.value?.select()
}

function finishTitleEdit() {
  editingTitle.value = false
  store.syncActiveFlowTitle()
}

function cancelTitleEdit() {
  store.project.title = originalTitle.value
  editingTitle.value = false
}
</script>

<template>
  <div
    ref="viewportRef"
    class="relative h-full overflow-auto bg-[linear-gradient(#e4e4e7_1px,transparent_1px),linear-gradient(90deg,#e4e4e7_1px,transparent_1px)] bg-[size:28px_28px] p-5"
    :class="isPanning ? 'cursor-grabbing' : 'cursor-default'"
    @click="closeContextMenu"
    @wheel="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div class="w-max origin-top-left" :style="{ transform: `scale(${zoom})` }">
      <div
        ref="canvasRef"
        class="combo-canvas rounded-xl bg-zinc-50 p-5 shadow-sm"
        :style="{
          width: `${canvasWidth}px`,
          '--main-card-width': `${store.mainCardWidth}px`,
          '--sub-card-width': `${store.subCardWidth}px`,
        }"
      >
        <header class="mb-5 flex items-end gap-3 border-b-2 border-zinc-900 pb-2">
          <div class="shrink-0">
            <p class="text-[10px] font-bold uppercase tracking-wide text-cyan-700">YGO Combo Flow</p>
            <div class="export-hidden h-7">
              <input
                v-if="editingTitle"
                ref="titleInputRef"
                v-model="store.project.title"
                class="h-7 min-w-52 border-b-2 border-cyan-600 bg-transparent text-xl font-black text-zinc-950 outline-none"
                @blur="finishTitleEdit"
                @keydown.enter.prevent="finishTitleEdit"
                @keydown.escape.prevent="cancelTitleEdit"
              >
              <button v-else class="h-7 text-xl font-black text-zinc-950 hover:text-cyan-700" title="修改一圖名" @click="startTitleEdit">
                {{ store.project.title }}
              </button>
            </div>
            <h1 class="export-only hidden h-7 items-center text-xl font-black text-zinc-950">{{ store.project.title }}</h1>
          </div>
          <FlowOverview @open-menu="openContextMenu" />
          <p class="shrink-0 text-xs font-semibold text-zinc-500">{{ store.project.steps.length }} Steps</p>
        </header>

        <div class="flex flex-col gap-4">
          <section
            v-for="row in rows"
            :key="row.rowIndex"
            class="relative"
            :style="{ width: `${flowWidth}px`, height: `${rowHeight}px` }"
          >
            <div
              class="pointer-events-none absolute top-1/2 z-20 flex -translate-y-1/2 items-center justify-center text-zinc-500"
              :class="row.rowIndex % 2 === 0 ? 'left-0' : 'right-0'"
              :style="{ width: `${rowEdgePadding}px` }"
            >
              <ArrowRight v-if="row.rowIndex % 2 === 0" :size="24" :stroke-width="1.75" />
              <ArrowLeft v-else :size="24" :stroke-width="1.75" />
            </div>
            <div
              class="grid h-full items-start gap-3"
              :style="{
                width: `${flowWidth}px`,
                paddingLeft: row.direction === 'ltr' ? `${rowEdgePadding}px` : '0',
                paddingRight: row.direction === 'rtl' ? `${rowEdgePadding}px` : '0',
                gridTemplateColumns: `repeat(${displayColumnCount}, ${stepCellWidth}px)`,
              }"
            >
              <div
                v-for="(item, cellIndex) in row.cells"
                :key="`${row.rowIndex}-${cellIndex}`"
                class="h-full"
              >
                <StepNode
                  v-if="item"
                  :step="item.step"
                  :step-index="item.index"
                  :direction="row.direction"
                  :row-height="rowHeight"
                  @open-menu="openContextMenu"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <button
      class="export-hidden fixed bottom-4 left-[21rem] z-40 inline-flex h-9 items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 text-xs font-black text-zinc-700 shadow-lg hover:bg-zinc-100"
      title="重置畫布縮放"
      @click="resetZoom"
    >
      <ZoomIn :size="15" />
      {{ Math.round(zoom * 100) }}%
      <RotateCcw :size="13" />
    </button>

    <div
      v-if="contextMenu"
      class="export-hidden fixed z-50 w-52 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-xl"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click.stop
    >
      <template v-if="contextMenu.kind === 'step'">
        <button class="block w-full px-3 py-2 text-left hover:bg-zinc-100" @click="runContextAction(({ index }) => store.addStep(index))">
          插入步驟
        </button>
        <button class="block w-full px-3 py-2 text-left hover:bg-zinc-100" @click="runContextAction(({ index }) => store.addSteps(index, 10))">
          插入 10 步驟
        </button>
        <button class="block w-full px-3 py-2 text-left hover:bg-zinc-100" @click="runContextAction(({ index }) => store.clearStep(index))">
          清空內容
        </button>
        <button class="block w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50" @click="runContextAction(({ index }) => store.deleteStep(index))">
          刪除此步驟
        </button>
      </template>

      <template v-else-if="contextMenu.kind === 'material'">
        <button class="block w-full px-3 py-2 text-left hover:bg-zinc-100" @click="runContextAction(({ index }) => store.addMaterialSlot(index))">
          新增素材
        </button>
        <button class="block w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50" @click="runContextAction(({ index, slot }) => store.removeMaterialSlot(index, slot.materialIndex))">
          刪除素材
        </button>
      </template>

      <template v-else-if="contextMenu.kind === 'chain'">
        <button class="block w-full px-3 py-2 text-left hover:bg-zinc-100" @click="runContextAction(({ index, slot }) => store.addChainBlock(index, slot?.chainIndex ?? null))">
          新增連鎖發動
        </button>
        <button class="block w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50" @click="runContextAction(({ index, slot }) => store.removeChainBlock(index, slot?.chainIndex ?? 0))">
          刪除連鎖發動
        </button>
        <button class="block w-full px-3 py-2 text-left hover:bg-zinc-100" @click="runContextAction(({ index, slot }) => store.addChainTarget(index, slot?.chainIndex ?? 0))">
          新增連鎖效果對象
        </button>
        <button class="block w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50" @click="runContextAction(({ index, slot }) => store.removeChainTarget(index, slot?.chainIndex ?? 0, slot?.targetIndex ?? null))">
          刪除連鎖效果對象
        </button>
      </template>

      <template v-else-if="contextMenu.kind === 'overview'">
        <button class="block w-full px-3 py-2 text-left hover:bg-zinc-100" @click="runContextAction(({ slot }) => store.addOverviewSlot(slot.group, slot.slotIndex))">
          新增卡格
        </button>
        <button
          class="block w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="contextMenu.slot.slotIndex === null"
          @click="runContextAction(({ slot }) => store.removeOverviewSlot(slot.group, slot.slotIndex))"
        >
          刪除卡格
        </button>
      </template>
    </div>
  </div>
</template>
