import { selectedRegion } from './selection.js'
import { clamp } from './geometry.js'

export const PROMPT_REVEAL_STAGGER = 18
export const PROMPT_REVEAL_DURATION = 360

export function initialAura() {
  return { left: '', right: '', balance: 50 }
}

// A whole-image selection and an unselected image use the same prompt variant.
// The draft stays shared so changing the target never discards an edit.
export function promptType(document) {
  return selectedRegion(document) ? 'region' : 'image'
}

export function auraRange({ left, right }) {
  const min = left.trim() ? 0 : 50
  const max = right.trim() ? 100 : 50
  return { min, max, disabled: min === max }
}

export function changeAura(aura, patch = {}) {
  const next = { ...aura, ...patch }
  const balance = Number(next.balance)
  const { min, max } = auraRange(next)
  return { ...next, balance: clamp(Number.isFinite(balance) ? balance : aura.balance, min, max) }
}

export function canGeneratePrompt(document, { busy = false, selecting = false } = {}) {
  const prompt = document.prompt.trim()
  return Boolean(document.image && prompt && prompt !== '/' && !busy && !selecting)
}

export function promptRequest(document) {
  if (!canGeneratePrompt(document)) return null
  const type = promptType(document)
  return {
    ...document,
    promptType: type,
    region: type === 'region' ? selectedRegion(document) : null,
    // Aura only applies to the image prompt, while its draft survives region edits.
    aura: type === 'image' ? changeAura(document.aura) : undefined,
    targetImages: [{ id: document.imageId, src: document.image, ...document.imageFrame }],
  }
}
