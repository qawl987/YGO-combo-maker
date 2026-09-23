import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getCardImage, getCdnImageUrl } from '../services/cardImages'

const STORAGE_KEY = 'ygo-combo-builder:draft'
const SAVED_FLOWS_KEY = 'ygo-combo-builder:saved-flows'

export const actionOptions = [
  { value: 'NORMAL_SUMMON', label: '通召' },
  { value: 'SPECIAL_SUMMON', label: '特召' },
  { value: 'ACTIVATE_EFFECT', label: '發動' },
  { value: 'SET', label: '覆蓋' },
  { value: 'CUSTOM', label: '自訂' },
]

export const roleOptions = [
  { value: 'MATERIAL', label: '素材' },
  { value: 'TARGET', label: '對象' },
  { value: 'SEARCH_TARGET', label: '檢索' },
  { value: 'COST', label: '代價' },
  { value: 'CUSTOM', label: '自訂' },
]

function uid(prefix) {
  if (crypto?.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function newSubCardSlot() {
  return {
    id: uid('slot'),
    card: null,
    role: 'MATERIAL',
    customRoleText: '',
  }
}

function newChainBlock() {
  return {
    id: uid('chain'),
    sourceCard: null,
    targetCards: [{ id: uid('target'), card: null }],
  }
}

function newStep() {
  return {
    id: uid('step'),
    actionType: 'SPECIAL_SUMMON',
    customActionText: '',
    mainCard: null,
    materials: [newSubCardSlot(), newSubCardSlot()],
    chainEffects: [newChainBlock()],
  }
}

function createDefaultProject() {
  return {
    version: '1.0.0',
    title: '未命名展開',
    gridSettings: {
      columnsPerRow: 5,
      mainCardWidth: 96,
      subCardRatio: 0.5,
      gapColumnWidth: 44,
    },
    library: [],
    steps: [newStep(), newStep(), newStep(), newStep()],
  }
}

function cloneProject(project) {
  return JSON.parse(JSON.stringify(project))
}

function stripRuntimeImageUrls(project) {
  const cleaned = cloneProject(project)
  const normalizeCard = (card) => {
    if (!card) return null
    return {
      passcode: card.passcode,
      imageUrl: getCdnImageUrl(card.passcode),
      customName: card.customName || '',
    }
  }

  cleaned.library = cleaned.library.map(normalizeCard)
  cleaned.steps.forEach((step) => {
    step.mainCard = normalizeCard(step.mainCard)
    step.materials.forEach((slot) => {
      slot.card = normalizeCard(slot.card)
    })
    step.chainEffects.forEach((block) => {
      block.sourceCard = normalizeCard(block.sourceCard)
      block.targetCards = (block.targetCards || []).map((target) => ({
        ...target,
        card: normalizeCard(target.card),
      }))
      delete block.targetCard
    })
  })

  return cleaned
}

function projectToFlow(project, id = uid('flow')) {
  const normalized = stripRuntimeImageUrls(project)
  return {
    id,
    version: normalized.version,
    title: normalized.title,
    gridSettings: normalized.gridSettings,
    steps: normalized.steps,
  }
}

export const useComboStore = defineStore('combo', () => {
  const project = ref(createDefaultProject())
  const selectedCard = ref(null)
  const activeSlot = ref(null)
  const statusMessage = ref('')
  const isLoadingCard = ref(false)
  const savedFlows = ref([])
  const activeSavedFlowId = ref(null)

  const columnsPerRow = computed(() => Number(project.value.gridSettings.columnsPerRow) || 4)
  const mainCardWidth = computed(() => Number(project.value.gridSettings.mainCardWidth) || 140)
  const subCardWidth = computed(() => Math.round(mainCardWidth.value * (Number(project.value.gridSettings.subCardRatio) || 0.5)))

  function setStatus(message) {
    statusMessage.value = message
    window.clearTimeout(setStatus.timer)
    setStatus.timer = window.setTimeout(() => {
      if (statusMessage.value === message) statusMessage.value = ''
    }, 2600)
  }

  async function hydrateCard(card) {
    if (!card?.passcode) return null
    return {
      passcode: card.passcode,
      imageUrl: await getCardImage(card.passcode),
      customName: card.customName || '',
    }
  }

  async function hydrateStep(step) {
    const hydrated = {
      ...newStep(),
      ...step,
      materials: step.materials?.length ? step.materials : [newSubCardSlot(), newSubCardSlot()],
      chainEffects: step.chainEffects?.length ? step.chainEffects : [newChainBlock()],
    }
    hydrated.mainCard = await hydrateCard(step.mainCard)
    hydrated.materials = await Promise.all(hydrated.materials.map(async (slot) => ({
      ...newSubCardSlot(),
      ...slot,
      card: await hydrateCard(slot.card),
    })))
    hydrated.chainEffects = await Promise.all(hydrated.chainEffects.map(async (block) => ({
      ...newChainBlock(),
      ...block,
      sourceCard: await hydrateCard(block.sourceCard),
      targetCards: await Promise.all(
        (block.targetCards || [{ id: uid('target'), card: block.targetCard || null }]).map(async (target) => ({
          id: target.id || uid('target'),
          card: await hydrateCard(target.card),
        })),
      ),
    })))
    return hydrated
  }

  async function addCardByPasscode(passcode) {
    const rawPasscode = String(passcode).trim()
    if (!/^\d{1,8}$/.test(rawPasscode)) {
      throw new Error('請輸入 1 到 8 碼數字卡片密碼')
    }
    const cleanPasscode = rawPasscode.replace(/^0+/, '') || '0'
    isLoadingCard.value = true
    try {
      const imageUrl = await getCardImage(cleanPasscode)
      const existing = project.value.library.find((card) => card.passcode === cleanPasscode)
      const card = existing || { passcode: cleanPasscode, imageUrl, customName: '' }
      if (!existing) project.value.library.unshift(card)
      selectedCard.value = card
      setStatus(`已加入 ${cleanPasscode}`)
      return card
    } finally {
      isLoadingCard.value = false
    }
  }

  function selectCard(card) {
    selectedCard.value = card
    if (card) setStatus(`已選取 ${card.passcode}`)
  }

  function focusSlot(slot) {
    activeSlot.value = slot
  }

  function setSlotCard(slot, card) {
    if (!slot) return
    const step = project.value.steps[slot.stepIndex]
    if (!step) return

    if (slot.type === 'main') {
      step.mainCard = card
    } else if (slot.type === 'material') {
      step.materials[slot.materialIndex].card = card
    } else if (slot.type === 'chain') {
      if (slot.field === 'sourceCard') {
        step.chainEffects[slot.chainIndex].sourceCard = card
      } else if (slot.field === 'targetCard') {
        step.chainEffects[slot.chainIndex].targetCards[slot.targetIndex].card = card
      }
    }
  }

  function pasteSelectedCard() {
    if (!selectedCard.value || !activeSlot.value) return
    setSlotCard(activeSlot.value, selectedCard.value)
    setStatus(`已貼上 ${selectedCard.value.passcode}`)
  }

  function clearActiveSlot() {
    if (!activeSlot.value) return
    setSlotCard(activeSlot.value, null)
    setStatus('已清空卡槽')
  }

  function addStep(afterIndex = project.value.steps.length - 1) {
    project.value.steps.splice(afterIndex + 1, 0, newStep())
  }

  function addSteps(afterIndex, count) {
    const steps = Array.from({ length: count }, () => newStep())
    project.value.steps.splice(afterIndex + 1, 0, ...steps)
  }

  function deleteStep(index) {
    if (project.value.steps.length <= 1) {
      project.value.steps[0] = newStep()
      return
    }
    project.value.steps.splice(index, 1)
  }

  function clearStep(index) {
    const oldStep = project.value.steps[index]
    project.value.steps[index] = { ...newStep(), id: oldStep.id }
  }

  function addMaterialSlot(stepIndex) {
    const slots = project.value.steps[stepIndex]?.materials
    if (slots && slots.length < 5) slots.push(newSubCardSlot())
  }

  function removeMaterialSlot(stepIndex, materialIndex) {
    const slots = project.value.steps[stepIndex]?.materials
    if (slots && slots.length > 1) slots.splice(materialIndex, 1)
  }

  function addChainBlock(stepIndex, afterIndex = null) {
    const blocks = project.value.steps[stepIndex]?.chainEffects
    if (!blocks || blocks.length >= 4) return
    if (afterIndex === null) {
      blocks.push(newChainBlock())
    } else {
      blocks.splice(afterIndex + 1, 0, newChainBlock())
    }
  }

  function removeChainBlock(stepIndex, chainIndex) {
    const blocks = project.value.steps[stepIndex]?.chainEffects
    if (!blocks) return
    if (blocks.length <= 1) {
      blocks[0] = newChainBlock()
      return
    }
    blocks.splice(chainIndex, 1)
  }

  function addChainTarget(stepIndex, chainIndex) {
    const targets = project.value.steps[stepIndex]?.chainEffects[chainIndex]?.targetCards
    if (targets && targets.length < 4) {
      targets.push({ id: uid('target'), card: null })
    }
  }

  function removeChainTarget(stepIndex, chainIndex, targetIndex = null) {
    const block = project.value.steps[stepIndex]?.chainEffects[chainIndex]
    if (!block) return
    const targets = block.targetCards
    const removeIndex = targetIndex ?? targets.length - 1
    if (targets.length <= 1) {
      targets[0].card = null
      return
    }
    targets.splice(removeIndex, 1)
  }

  function persistSavedFlows() {
    localStorage.setItem(SAVED_FLOWS_KEY, JSON.stringify({
      flows: savedFlows.value,
      activeSavedFlowId: activeSavedFlowId.value,
    }))
  }

  function syncActiveFlow() {
    if (!activeSavedFlowId.value) return
    const index = savedFlows.value.findIndex((flow) => flow.id === activeSavedFlowId.value)
    if (index < 0) return
    savedFlows.value[index] = projectToFlow(project.value, activeSavedFlowId.value)
  }

  function saveDraft() {
    syncActiveFlow()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripRuntimeImageUrls(project.value)))
    persistSavedFlows()
  }

  async function loadDraft() {
    const savedRaw = localStorage.getItem(SAVED_FLOWS_KEY)
    let savedActiveId = null
    if (savedRaw) {
      const savedPayload = JSON.parse(savedRaw)
      savedFlows.value = Array.isArray(savedPayload) ? savedPayload : (savedPayload.flows || [])
      savedActiveId = Array.isArray(savedPayload) ? null : savedPayload.activeSavedFlowId
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    const hasSavedActiveFlow = savedFlows.value.some((flow) => flow.id === savedActiveId)

    if (raw) {
      await importProject(JSON.parse(raw), false)
      if (hasSavedActiveFlow) {
        activeSavedFlowId.value = savedActiveId
      } else {
        const flow = projectToFlow(project.value)
        savedFlows.value.push(flow)
        activeSavedFlowId.value = flow.id
      }
    } else if (hasSavedActiveFlow) {
      await loadSavedFlow(savedActiveId, false)
    } else if (savedFlows.value.length) {
      await loadSavedFlow(savedFlows.value[0].id, false)
    } else {
      const flow = projectToFlow(project.value)
      savedFlows.value.push(flow)
      activeSavedFlowId.value = flow.id
    }

    saveDraft()
  }

  function exportProject() {
    return stripRuntimeImageUrls(project.value)
  }

  async function importProject(payload, announce = true) {
    const next = {
      ...createDefaultProject(),
      ...payload,
      gridSettings: {
        ...createDefaultProject().gridSettings,
        ...(payload.gridSettings || {}),
      },
      library: payload.library || [],
      steps: payload.steps?.length ? payload.steps : [newStep()],
    }

    next.library = (await Promise.all(next.library.map(hydrateCard))).filter(Boolean)

    next.steps = await Promise.all(next.steps.map(hydrateStep))
    project.value = next
    activeSavedFlowId.value = null
    activeSlot.value = null
    selectedCard.value = null
    if (announce) {
      const flow = projectToFlow(project.value)
      savedFlows.value.push(flow)
      activeSavedFlowId.value = flow.id
      saveDraft()
      setStatus('專案已匯入')
    }
  }

  function clearLibrary() {
    project.value.library = []
    selectedCard.value = null
    setStatus('素材庫已清空')
  }

  function nextUntitledFlowName() {
    const titles = new Set(savedFlows.value.map((flow) => flow.title))
    if (!titles.has('未命名展開')) return '未命名展開'
    let suffix = 1
    while (titles.has(`未命名展開(${suffix})`)) suffix += 1
    return `未命名展開(${suffix})`
  }

  function createBlankFlow() {
    const library = project.value.library
    const nextProject = createDefaultProject()
    nextProject.title = nextUntitledFlowName()
    nextProject.library = library
    project.value = nextProject
    const flow = projectToFlow(nextProject)
    savedFlows.value.push(flow)
    activeSavedFlowId.value = flow.id
    activeSlot.value = null
    saveDraft()
    setStatus('已新增空白畫布')
  }

  async function loadSavedFlow(flowId, announce = true) {
    const flow = savedFlows.value.find((item) => item.id === flowId)
    if (!flow) return
    const library = project.value.library
    const selected = selectedCard.value
    activeSavedFlowId.value = null
    await importProject({ ...cloneProject(flow), library }, false)
    project.value.library = library
    selectedCard.value = selected
    activeSavedFlowId.value = flow.id
    persistSavedFlows()
    if (announce) setStatus(`已切換至 ${flow.title}`)
  }

  function duplicateSavedFlow(flowId) {
    const source = savedFlows.value.find((flow) => flow.id === flowId)
    if (!source) return
    const duplicate = {
      ...cloneProject(source),
      id: uid('flow'),
      title: nextUntitledFlowName(),
    }
    savedFlows.value.push(duplicate)
    persistSavedFlows()
    setStatus(`已複製為 ${duplicate.title}`)
  }

  async function deleteSavedFlow(flowId) {
    const index = savedFlows.value.findIndex((flow) => flow.id === flowId)
    if (index < 0) return
    const wasActive = activeSavedFlowId.value === flowId
    savedFlows.value.splice(index, 1)
    if (wasActive) {
      activeSavedFlowId.value = null
      const nextFlow = savedFlows.value[Math.min(index, savedFlows.value.length - 1)]
      if (nextFlow) {
        await loadSavedFlow(nextFlow.id, false)
      } else {
        createBlankFlow()
      }
    } else {
      persistSavedFlows()
    }
    setStatus('已刪除一圖')
  }

  function renameSavedFlow(flowId, title) {
    const nextTitle = String(title).trim()
    if (!nextTitle) return
    const flow = savedFlows.value.find((item) => item.id === flowId)
    if (!flow) return
    flow.title = nextTitle
    if (activeSavedFlowId.value === flowId) project.value.title = nextTitle
    persistSavedFlows()
  }

  function syncActiveFlowTitle() {
    const title = String(project.value.title).trim() || '未命名展開'
    project.value.title = title
    syncActiveFlow()
    persistSavedFlows()
  }

  return {
    project,
    selectedCard,
    activeSlot,
    statusMessage,
    isLoadingCard,
    savedFlows,
    activeSavedFlowId,
    columnsPerRow,
    mainCardWidth,
    subCardWidth,
    addCardByPasscode,
    selectCard,
    focusSlot,
    setSlotCard,
    pasteSelectedCard,
    clearActiveSlot,
    addStep,
    addSteps,
    deleteStep,
    clearStep,
    addMaterialSlot,
    removeMaterialSlot,
    addChainBlock,
    removeChainBlock,
    addChainTarget,
    removeChainTarget,
    saveDraft,
    loadDraft,
    exportProject,
    importProject,
    clearLibrary,
    createBlankFlow,
    loadSavedFlow,
    duplicateSavedFlow,
    deleteSavedFlow,
    renameSavedFlow,
    syncActiveFlowTitle,
    setStatus,
  }
})
