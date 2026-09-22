<script setup>
import { computed, ref } from 'vue'
import { CornerDownLeft, CornerDownRight } from '@lucide/vue'
import StepNode from './StepNode.vue'
import { useComboStore } from '../stores/combo'

const store = useComboStore()
const canvasRef = ref(null)
const contextMenu = ref(null)

defineExpose({ canvasRef })

const rows = computed(() => {
  const rowSize = store.columnsPerRow
  const chunks = []
  for (let start = 0; start < store.project.steps.length; start += rowSize) {
    const rowIndex = Math.floor(start / rowSize)
    const items = store.project.steps.slice(start, start + rowSize).map((step, offset) => ({
      step,
      index: start + offset,
    }))
    chunks.push({
      rowIndex,
      direction: rowIndex % 2 === 0 ? 'ltr' : 'rtl',
      items: rowIndex % 2 === 0 ? items : [...items].reverse(),
    })
  }
  return chunks
})

function openContextMenu({ event, index }) {
  contextMenu.value = {
    index,
    x: event.clientX,
    y: event.clientY,
  }
}

function closeContextMenu() {
  contextMenu.value = null
}

function runContextAction(action) {
  if (!contextMenu.value) return
  const index = contextMenu.value.index
  closeContextMenu()
  action(index)
}
</script>

<template>
  <div class="relative h-full overflow-auto bg-[linear-gradient(#e4e4e7_1px,transparent_1px),linear-gradient(90deg,#e4e4e7_1px,transparent_1px)] bg-[size:28px_28px] p-8" @click="closeContextMenu">
    <div
      ref="canvasRef"
      class="combo-canvas min-w-max rounded-xl bg-zinc-50 p-8 shadow-sm"
      :style="{ '--main-card-width': `${store.mainCardWidth}px`, '--sub-card-width': `${store.subCardWidth}px` }"
    >
      <header class="mb-7 flex items-end justify-between border-b-2 border-zinc-900 pb-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wide text-cyan-700">YGO Combo Flow</p>
          <h1 class="text-3xl font-black text-zinc-950">{{ store.project.title }}</h1>
        </div>
        <p class="text-sm font-semibold text-zinc-500">{{ store.project.steps.length }} Steps</p>
      </header>

      <div class="space-y-12">
        <section v-for="row in rows" :key="row.rowIndex" class="relative">
          <div class="flex items-start gap-6" :class="row.direction === 'rtl' ? 'flex-row-reverse' : ''">
            <template v-for="(item, displayIndex) in row.items" :key="item.step.id">
              <StepNode
                :step="item.step"
                :step-index="item.index"
                :direction="row.direction"
                @open-menu="openContextMenu"
              />
              <div
                v-if="displayIndex < row.items.length - 1"
                class="flow-arrow mt-28 flex h-8 w-12 shrink-0 items-center justify-center text-zinc-600"
                :class="row.direction === 'rtl' ? 'rotate-180' : ''"
              >
                <span class="h-0.5 w-10 bg-current" />
                <span class="-ml-2 h-3 w-3 rotate-45 border-r-2 border-t-2 border-current" />
              </div>
            </template>
          </div>
          <div
            v-if="row.rowIndex < rows.length - 1"
            class="mt-4 flex text-zinc-600"
            :class="row.direction === 'ltr' ? 'justify-end pr-10' : 'justify-start pl-10'"
          >
            <div class="flex h-14 w-24 items-center justify-center rounded-full border-2 border-zinc-400 bg-white">
              <CornerDownLeft v-if="row.direction === 'ltr'" :size="28" />
              <CornerDownRight v-else :size="28" />
            </div>
          </div>
        </section>
      </div>
    </div>

    <div
      v-if="contextMenu"
      class="export-hidden fixed z-50 w-52 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-xl"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click.stop
    >
      <button class="block w-full px-3 py-2 text-left hover:bg-zinc-100" @click="runContextAction((index) => store.insertStepBefore(index))">
        向前插入步驟
      </button>
      <button class="block w-full px-3 py-2 text-left hover:bg-zinc-100" @click="runContextAction((index) => store.addStep(index))">
        向後插入步驟
      </button>
      <button class="block w-full px-3 py-2 text-left hover:bg-zinc-100" @click="runContextAction((index) => store.clearStep(index))">
        清空內容
      </button>
      <button class="block w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50" @click="runContextAction((index) => store.deleteStep(index))">
        刪除此步驟
      </button>
    </div>
  </div>
</template>
