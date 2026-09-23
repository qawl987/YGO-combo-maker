<script setup>
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight, RotateCcw, ZoomIn } from '@lucide/vue'
import StepNode from './StepNode.vue'
import { useComboStore } from '../stores/combo'

const store = useComboStore()
const canvasRef = ref(null)
const viewportRef = ref(null)
const contextMenu = ref(null)
const zoom = ref(1)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0, left: 0, top: 0 })

defineExpose({ canvasRef })

const stepCellWidth = computed(() => store.mainCardWidth + store.subCardWidth + 34)
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
    const cells = Array.from({ length: rowSize }, () => null)
    const offset = direction === 'rtl' ? rowSize - visualItems.length : 0
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
    <div class="min-w-max origin-top-left" :style="{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }">
      <div
        ref="canvasRef"
        class="combo-canvas min-w-max rounded-xl bg-zinc-50 p-5 shadow-sm"
        :style="{ '--main-card-width': `${store.mainCardWidth}px`, '--sub-card-width': `${store.subCardWidth}px` }"
      >
        <header class="mb-5 flex items-end justify-between border-b-2 border-zinc-900 pb-2">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wide text-cyan-700">YGO Combo Flow</p>
            <h1 class="text-xl font-black text-zinc-950">{{ store.project.title }}</h1>
          </div>
          <p class="text-xs font-semibold text-zinc-500">{{ store.project.steps.length }} Steps</p>
        </header>

        <div class="flex flex-col gap-9">
          <section
            v-for="row in rows"
            :key="row.rowIndex"
            class="relative"
            :style="{ height: `${rowHeight}px` }"
          >
            <div
              v-if="row.rowIndex > 0"
              class="pointer-events-none absolute -top-7 z-20 flex h-6 items-center text-zinc-500"
              :class="row.rowIndex % 2 === 0 ? 'left-1' : 'right-1'"
            >
              <ArrowRight v-if="row.rowIndex % 2 === 0" :size="24" :stroke-width="1.75" />
              <ArrowLeft v-else :size="24" :stroke-width="1.75" />
            </div>
            <div
              class="grid h-full items-start gap-3"
              :style="{ gridTemplateColumns: `repeat(${store.columnsPerRow}, ${stepCellWidth}px)` }"
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
    </div>
  </div>
</template>
