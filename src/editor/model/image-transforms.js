import { clamp } from './geometry.js'

const MIN_IMAGE_SIZE = 24

export function visibleImageFrame(document) {
  return document.imageCrop ?? document.imageFrame
}

export function intersectFrames(first, second) {
  const x = Math.max(first.x, second.x)
  const y = Math.max(first.y, second.y)
  return {
    x, y,
    width: Math.max(0, Math.min(first.x + first.width, second.x + second.width) - x),
    height: Math.max(0, Math.min(first.y + first.height, second.y + second.height) - y),
  }
}

function transformImageToFrame(document, next) {
  const visible = visibleImageFrame(document)
  const scale = next.width / visible.width
  const source = document.imageFrame
  return {
    imageFrame: {
      x: next.x + (source.x - visible.x) * scale,
      y: next.y + (source.y - visible.y) * scale,
      width: source.width * scale,
      height: source.height * scale,
    },
    imageCrop: document.imageCrop ? next : null,
    imageTransformed: true,
    region: null,
    promptOutputIds: [],
    selected: [document.imageId],
  }
}

export function moveImage(document, bounds, delta) {
  const frame = visibleImageFrame(document)
  const x = clamp(frame.x + delta.x, bounds.x, bounds.x + Math.max(0, bounds.width - frame.width))
  const y = clamp(frame.y + delta.y, bounds.y, bounds.y + Math.max(0, bounds.height - frame.height))
  if (x === frame.x && y === frame.y) return null
  return transformImageToFrame(document, { ...frame, x, y })
}

// Image corner handles preserve aspect ratio and keep the visible photo in the canvas.
export function resizeImage(document, bounds, corner, delta) {
  const frame = visibleImageFrame(document)
  const west = corner.includes('w')
  const north = corner.includes('n')
  const anchor = { x: frame.x + (west ? frame.width : 0), y: frame.y + (north ? frame.height : 0) }
  const dx = (west ? -1 : 1) * delta.x
  const dy = (north ? -1 : 1) * delta.y
  const scaleDelta = (dx * frame.width + dy * frame.height) / (frame.width ** 2 + frame.height ** 2)
  const maxWidth = west ? anchor.x - bounds.x : bounds.x + bounds.width - anchor.x
  const maxHeight = north ? anchor.y - bounds.y : bounds.y + bounds.height - anchor.y
  const maximum = Math.min(maxWidth / frame.width, maxHeight / frame.height)
  const minimum = Math.min(maximum, MIN_IMAGE_SIZE / Math.min(frame.width, frame.height))
  const scale = clamp(1 + scaleDelta, minimum, maximum)
  if (Math.abs(scale - 1) < 1e-10) return null
  const width = frame.width * scale
  const height = frame.height * scale
  return transformImageToFrame(document, {
    x: anchor.x - (west ? width : 0),
    y: anchor.y - (north ? height : 0),
    width, height,
  })
}

// Crop handles move the mask, independently of the full source image behind it.
export function resizeCrop(frame, bounds, handle, delta) {
  let left = frame.x, top = frame.y
  let right = frame.x + frame.width, bottom = frame.y + frame.height
  const minimum = Math.min(MIN_IMAGE_SIZE, frame.width, frame.height)
  if (handle.includes('w')) left = clamp(left + delta.x, bounds.x, right - minimum)
  if (handle.includes('e')) right = clamp(right + delta.x, left + minimum, bounds.x + bounds.width)
  if (handle.includes('n')) top = clamp(top + delta.y, bounds.y, bottom - minimum)
  if (handle.includes('s')) bottom = clamp(bottom + delta.y, top + minimum, bounds.y + bounds.height)
  return { x: left, y: top, width: right - left, height: bottom - top }
}

export function moveImageBehindCrop(source, crop, delta) {
  return {
    ...source,
    x: clamp(source.x + delta.x, crop.x + crop.width - source.width, crop.x),
    y: clamp(source.y + delta.y, crop.y + crop.height - source.height, crop.y),
  }
}

export function cropImagePatch(document, draft) {
  const source = document.imageFrame
  const visible = visibleImageFrame(document)
  const same = (first, second) => ['x', 'y', 'width', 'height'].every((key) => Math.abs(first[key] - second[key]) < 1e-8)
  if (same(source, draft.sourceFrame) && same(visible, draft.box)) return null
  return {
    imageFrame: draft.sourceFrame,
    imageCrop: draft.box,
    imageTransformed: true,
    selected: [document.imageId],
    region: null,
    promptOutputIds: [],
  }
}

export function cropInsets(source, crop) {
  if (!crop) return undefined
  const top = Math.max(0, (crop.y - source.y) / source.height * 100)
  const right = Math.max(0, (source.x + source.width - crop.x - crop.width) / source.width * 100)
  const bottom = Math.max(0, (source.y + source.height - crop.y - crop.height) / source.height * 100)
  const left = Math.max(0, (crop.x - source.x) / source.width * 100)
  return `inset(${top}% ${right}% ${bottom}% ${left}%)`
}
