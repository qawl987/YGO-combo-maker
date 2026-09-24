<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { toPng } from 'html-to-image'
import Sidebar from './components/Sidebar.vue'
import SnakeFlowGrid from './components/SnakeFlowGrid.vue'
import { useComboStore } from './stores/combo'

const store = useComboStore()
const gridRef = ref(null)
const exporting = ref(false)

function downloadBlob(blob, filename) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function inlineCanvasImages(node) {
  const images = Array.from(node.querySelectorAll('img'))
  const originals = []

  await Promise.all(images.map(async (image) => {
    originals.push([image, image.src])
    if (image.src.startsWith('data:')) return
    const response = await fetch(image.src)
    if (!response.ok) throw new Error(`卡圖讀取失敗：${image.alt || image.src}`)
    image.src = await blobToDataUrl(await response.blob())
    await image.decode?.().catch(() => {})
  }))

  return () => {
    originals.forEach(([image, src]) => {
      image.src = src
    })
  }
}

function exportJson() {
  const payload = JSON.stringify(store.exportProject(), null, 2)
  downloadBlob(new Blob([payload], { type: 'application/json' }), `${store.project.title || 'combo-project'}.json`)
}

async function importJson(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const payload = JSON.parse(await file.text())
    await store.importProject(payload)
  } catch (error) {
    store.setStatus(`匯入失敗：${error.message}`)
  } finally {
    event.target.value = ''
  }
}

async function exportPng() {
  const node = gridRef.value?.canvasRef
  if (!node) return
  exporting.value = true
  document.body.classList.add('is-exporting')
  node.classList.add('is-exporting')
  let restoreImages = () => {}
  await nextTick()
  try {
    restoreImages = await inlineCanvasImages(node)
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#fafafa',
      filter: (element) => {
        const isEmptyCardSlot = element.classList?.contains('is-empty')
          && (element.classList.contains('card-slot-main')
            || element.classList.contains('card-slot-small')
            || element.classList.contains('card-slot-overview'))
        return !isEmptyCardSlot
      },
    })
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    downloadBlob(blob, `${store.project.title || 'combo-flow'}.png`)
    store.setStatus('PNG 已匯出')
  } catch (error) {
    console.error('PNG export failed', error)
    store.setStatus(`PNG 匯出失敗：${error?.message || error?.type || String(error)}`)
  } finally {
    restoreImages()
    document.body.classList.remove('is-exporting')
    node.classList.remove('is-exporting')
    exporting.value = false
  }
}

function onKeydown(event) {
  const target = event.target
  const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable
  if (isTyping) return

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
    if (store.selectedCard) {
      event.preventDefault()
      store.setStatus(`已複製 ${store.selectedCard.passcode}`)
    }
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
    event.preventDefault()
    store.pasteSelectedCard()
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    store.clearActiveSlot()
  }
}

onMounted(async () => {
  await store.loadDraft()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

watch(
  () => store.project,
  () => store.saveDraft(),
  { deep: true },
)
</script>

<template>
  <main class="flex h-screen overflow-hidden bg-zinc-100 text-zinc-950">
    <Sidebar
      :exporting="exporting"
      @export-json="exportJson"
      @import-json="importJson"
      @export-png="exportPng"
    />
    <section class="min-w-0 flex-1">
      <SnakeFlowGrid ref="gridRef" />
    </section>
  </main>
</template>
