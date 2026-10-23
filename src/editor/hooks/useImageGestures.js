import { useRef, useState } from 'react'
import { IMAGE_SIZE, canvasBounds } from '../model/layout.js'
import { selectImage, selectedRegion } from '../model/selection.js'
import { moveRegion, resizeRegion } from '../model/transforms.js'
import { lassoRegion } from '../model/lasso.js'
import { clamp, imagePoint, rectangle, documentPoint } from '../model/geometry.js'
import { visibleImageFrame, resizeImage, moveImage, resizeCrop, moveImageBehindCrop, intersectFrames } from '../model/image-transforms.js'

export function useImageGestures({ document, history, actions, tool, layout, closePanel, cropDraft }) {
  const boardRef = useRef(null)
  const drag = useRef(null)
  const [isSelectingRegion, setIsSelectingRegion] = useState(false)

  function toDocument(event) {
    return documentPoint(
      { x: event.clientX, y: event.clientY },
      boardRef.current.getBoundingClientRect(),
      layout,
    )
  }

  function startRegion(point) {
    const frame = visibleImageFrame(document)
    const size = {
      width: IMAGE_SIZE.width,
      height: (frame.height * IMAGE_SIZE.width) / frame.width,
    }
    const local = imagePoint(point, frame, size)
    if (local.x < 0 || local.y < 0 || local.x > size.width || local.y > size.height) return
    const active = {
      kind: 'region',
      shape: tool === 'rectangle' ? 'rectangle' : 'lasso',
      points: [local],
      frame,
      size,
      before: document,
    }
    drag.current = active
    setIsSelectingRegion(true)
    history.preview({
      selected: [document.imageId],
      region: regionForGesture(active),
      promptOutputIds: [],
    })
  }

  function onPointerDown(event) {
    if (event.button !== 0 || event.target.closest('button,input,form,[data-editor-controls]')) return
    const image = event.target.closest('[data-image]')
    const handle = event.target.closest('[data-resize-corner]')
    const regionMove = event.target.closest('[data-region-move]')
    const point = toDocument(event)
    actions.cancelGeneration?.()
    actions.closePrompt?.()
    closePanel()

    if (cropDraft) {
      if (!image && handle?.dataset.resizeTarget !== 'crop') return
      drag.current = {
        kind: handle ? 'resize-crop' : 'move-crop-image',
        corner: handle?.dataset.resizeCorner,
        point,
        beforeCrop: cropDraft,
      }
    } else if (tool === 'cursor' && (image || handle?.dataset.resizeTarget === 'image')) {
      history.preview(selectImage(document, document.imageId))
      drag.current = {
        kind: handle ? 'resize-image' : 'move-image',
        corner: handle?.dataset.resizeCorner,
        point,
        before: document,
        moved: false,
      }
    } else if (handle || regionMove) {
      const region = selectedRegion(document)
      if (tool !== 'rectangle' || !region || region.outline) return
      drag.current = {
        kind: handle ? 'resize-region' : 'move-region',
        corner: handle?.dataset.resizeCorner,
        point,
        before: document,
        moved: false,
      }
      setIsSelectingRegion(true)
    } else if (!image || image.dataset.image !== document.imageId) {
      history.preview(selectImage(document, image?.dataset.image))
      return
    } else if (tool === 'auto') {
      actions.autoSelect(document.imageId, point, image)
      return
    } else if (tool === 'rectangle' || tool === 'lasso') {
      startRegion(point)
    }

    if (drag.current) event.currentTarget.setPointerCapture(event.pointerId)
  }

  function transformRegion(active, point) {
    const delta = { x: point.x - active.point.x, y: point.y - active.point.y }
    const before = active.before
    const region = active.kind === 'move-region'
      ? moveRegion(before.region, visibleImageFrame(before), delta)
      : resizeRegion(before.region, visibleImageFrame(before), active.corner, delta)
    active.moved = region !== before.region
    history.preview({
      region,
      promptOutputIds: active.moved ? [] : before.promptOutputIds,
    })
  }

  function transformImage(active, point) {
    const delta = { x: point.x - active.point.x, y: point.y - active.point.y }
    const bounds = canvasBounds(active.before)
    const patch = active.kind === 'resize-image'
      ? resizeImage(active.before, bounds, active.corner, delta)
      : moveImage(active.before, bounds, delta)
    active.moved = Boolean(patch)
    history.preview(patch ?? { ...active.before, ...selectImage(active.before, active.before.imageId) })
  }

  function transformCrop(active, point) {
    const delta = { x: point.x - active.point.x, y: point.y - active.point.y }
    const before = active.beforeCrop
    if (active.kind === 'resize-crop') {
      const bounds = intersectFrames(before.sourceFrame, canvasBounds(document))
      actions.previewCrop({ ...before, box: resizeCrop(before.box, bounds, active.corner, delta) })
    } else {
      actions.previewCrop({ ...before, sourceFrame: moveImageBehindCrop(before.sourceFrame, before.box, delta) })
    }
  }

  function onPointerMove(event) {
    const active = drag.current
    if (!active) return
    if (active.beforeCrop) {
      transformCrop(active, toDocument(event))
      return
    }
    if (active.kind === 'resize-image' || active.kind === 'move-image') {
      transformImage(active, toDocument(event))
      return
    }
    if (active.kind !== 'region') {
      transformRegion(active, toDocument(event))
      return
    }
    const samples = event.getCoalescedEvents?.() ?? []
    for (const sample of samples.length ? samples : [event]) {
      addRegionPoint(active, toDocument(sample))
    }
    history.preview({ region: regionForGesture(active) })
  }

  function regionForGesture(active, complete = false) {
    if (active.shape !== 'rectangle') return lassoRegion(active.points, active.size, complete)
    const region = rectangle(active.points[0], active.points.at(-1))
    return complete && (region.width < 5 || region.height < 5) ? null : region
  }

  function addRegionPoint(active, point) {
    const local = imagePoint(point, active.frame, active.size)
    const next = {
      x: clamp(local.x, 0, active.size.width),
      y: clamp(local.y, 0, active.size.height),
    }
    const last = active.points.at(-1)
    if (next.x === last.x && next.y === last.y) return
    if (active.shape === 'rectangle') active.points[1] = next
    else active.points.push(next)
  }

  function onPointerUp(event) {
    const active = drag.current
    if (!active) return
    if (active.beforeCrop) {
      if (event) transformCrop(active, toDocument(event))
    } else if (active.kind === 'resize-image' || active.kind === 'move-image') {
      if (event) transformImage(active, toDocument(event))
      if (active.moved) history.commit(active.before)
    } else if (active.kind === 'region') {
      if (event) addRegionPoint(active, toDocument(event))
      const region = regionForGesture(active, true)
      if (!region) history.preview(active.before)
      else {
        history.preview({ region, promptOutputIds: [] })
        history.commit(active.before)
      }
    } else {
      if (event) transformRegion(active, toDocument(event))
      if (active.moved) history.commit(active.before)
    }
    drag.current = null
    setIsSelectingRegion(false)
  }

  function cancelGesture() {
    if (drag.current?.beforeCrop) actions.previewCrop(drag.current.beforeCrop)
    else if (drag.current?.before) history.preview(drag.current.before)
    drag.current = null
    setIsSelectingRegion(false)
  }

  return {
    boardRef,
    isSelectingRegion,
    cancelGesture,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: cancelGesture },
  }
}
