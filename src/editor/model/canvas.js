export const CANVAS_PROPORTIONS = [
  { id: 'original', label: 'Original', width: 1, height: 1 },
  { id: '2:3', label: '2:3', width: 2, height: 3 },
  { id: '3:4', label: '3:4', width: 3, height: 4 },
  { id: '9:16', label: '9:16', width: 9, height: 16 },
  { id: '3:2', label: '3:2', width: 3, height: 2 },
  { id: '4:3', label: '4:3', width: 4, height: 3 },
  { id: '16:9', label: '16:9', width: 16, height: 9 },
]

export function changeCanvasProportion(document, id) {
  if (document.canvasProportion === id || !CANVAS_PROPORTIONS.some((option) => option.id === id)) return null
  return { canvasProportion: id }
}

// Loading image metadata is presentation state, not a user resize operation.
export function imageDimensionsPatch(document, id, src, size) {
  if (document.imageId !== id || document.image !== src || size.width <= 0 || size.height <= 0) return null
  if (document.imageTransformed) return null
  const frame = document.imageFrame
  const height = frame.width * size.height / size.width
  if (Math.abs(frame.height - height) < 0.01) return null
  return { imageFrame: { ...frame, height }, canvasFrame: { ...frame, height } }
}

// Enlarge the canvas around the content; never crop or distort the image.
export function fitCanvasBounds(content, proportion = 'original') {
  const option = CANVAS_PROPORTIONS.find((item) => item.id === proportion) ?? CANVAS_PROPORTIONS[0]
  if (option.id === 'original') return content
  const ratio = option.width / option.height
  const width = Math.max(content.width, content.height * ratio)
  const height = Math.max(content.height, content.width / ratio)
  return {
    x: content.x - (width - content.width) / 2,
    y: content.y - (height - content.height) / 2,
    width,
    height,
  }
}
