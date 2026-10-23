import { useRef, useState } from 'react'
import { cropImagePatch, visibleImageFrame, intersectFrames } from '../model/image-transforms.js'
import { canvasBounds } from '../model/layout.js'

export function useCropSession(history) {
  const [draft, setDraft] = useState(null)
  const current = useRef(null)

  function preview(next) {
    current.current = next
    setDraft(next)
  }

  function begin(document) {
    preview({
      sourceFrame: document.imageFrame,
      box: intersectFrames(visibleImageFrame(document), canvasBounds(document)),
    })
  }

  function apply() {
    const next = current.current
    if (!next) return false
    history.update((document) => cropImagePatch(document, next))
    preview(null)
    return true
  }

  function cancel() {
    if (!current.current) return false
    preview(null)
    return true
  }

  return { draft, begin, preview, apply, cancel }
}
