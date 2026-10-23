import { originalImage } from './assets.js'
import { initialAura } from './prompts.js'

export function initialDocument() {
  return {
    imageId: 'source-original',
    imageFrame: { x: 343, y: 70, width: 831.96, height: 833 },
    canvasFrame: { x: 343, y: 70, width: 831.96, height: 833 },
    imageCrop: null,
    imageTransformed: false,
    image: originalImage,
    expansion: 0,
    canvasProportion: 'original',
    prompt: '',
    references: [],
    aura: initialAura(),
    region: null,
    results: [],
    promptOutputIds: [],
    selected: [],
  }
}

export function documentForImage(src) {
  return { ...initialDocument(), image: src, region: null }
}

export function deleteSelection(document) {
  if (!document.image || !document.selected.includes(document.imageId)) return null
  return {
    image: null,
    imageCrop: null,
    expansion: 0,
    prompt: '',
    references: [],
    aura: initialAura(),
    selected: [],
    region: null,
    promptOutputIds: [],
  }
}

export function appendResults(document, images, batchId, { forRegion = false } = {}) {
  if (!images.length) return null
  const added = images.map((image, index) => ({
    id: `${batchId}-${index}`,
    src: image.src,
  }))
  return {
    results: [...document.results, ...added],
    selected: document.image ? [document.imageId] : [],
    region: forRegion ? document.region : null,
    promptOutputIds: added.map((result) => result.id),
  }
}

export function favoriteResults(document, ids) {
  const chosen = new Set(ids)
  let changed = false
  const results = document.results.map((result) => {
    if (!chosen.has(result.id) || result.favorite) return result
    changed = true
    return { ...result, favorite: true }
  })
  return changed ? { results } : null
}

export function toggleResultFavorite(document, id) {
  if (!document.results.some((result) => result.id === id)) return null
  return {
    results: document.results.map((result) => result.id === id
      ? { ...result, favorite: !result.favorite }
      : result),
  }
}

export function editResult(document, id) {
  if (document.image && id === document.imageId) return null
  const result = document.results.find((item) => item.id === id)
  if (!result) return null
  const previousSource = { id: document.imageId, src: document.image }
  return {
    imageId: result.id,
    image: result.src,
    // Keep the current geometry and selection fixed while comparing versions.
    // Loading a variation's metadata must not re-fit the photo underneath it.
    imageTransformed: true,
    // Keep every output in its original slot, and retain the before image once.
    results: document.image && !document.results.some((item) => item.id === document.imageId)
      ? [previousSource, ...document.results]
      : document.results,
    selected: [result.id],
  }
}
