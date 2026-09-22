import { createStore, get, set } from 'idb-keyval'

const imageStore = createStore('ygo-combo-builder', 'card-images')
const objectUrls = new Map()

export function getCdnImageUrl(passcode) {
  return `/card-images/${passcode}.jpg`
}

export async function getCardImage(passcode) {
  const cleanPasscode = String(passcode).trim()
  if (!/^\d{1,8}$/.test(cleanPasscode)) {
    throw new Error('請輸入 1 到 8 碼數字卡片密碼')
  }

  if (objectUrls.has(cleanPasscode)) {
    return objectUrls.get(cleanPasscode)
  }

  const cachedBlob = await get(cleanPasscode, imageStore)
  if (cachedBlob) {
    const url = URL.createObjectURL(cachedBlob)
    objectUrls.set(cleanPasscode, url)
    return url
  }

  const cdnUrl = getCdnImageUrl(cleanPasscode)
  try {
    const response = await fetch(cdnUrl, { mode: 'cors' })
    if (!response.ok) {
      throw new Error('找不到卡圖，請確認密碼是否正確')
    }

    const blob = await response.blob()
    await set(cleanPasscode, blob, imageStore)
    const url = URL.createObjectURL(blob)
    objectUrls.set(cleanPasscode, url)
    return url
  } catch (error) {
    if (error.message) throw error
    return cdnUrl
  }
}
