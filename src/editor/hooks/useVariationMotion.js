import { useEffect, useLayoutEffect, useRef } from 'react'
import { animateVariationChanges } from '../services/variation-motion.js'

export function useVariationMotion(results, horizontal) {
  const listRef = useRef(null)
  const previous = useRef({ positions: new Map(), horizontal, ids: [] })
  const animations = useRef([])

  useEffect(() => () => animations.current.forEach((animation) => animation.cancel()), [])

  useLayoutEffect(() => {
    const ids = results.slice().reverse().map((result) => result.id)
    const before = previous.current
    if (before.horizontal === horizontal && ids.length === before.ids.length && ids.every((id, index) => id === before.ids[index])) return

    animations.current.forEach((animation) => animation.cancel())
    animations.current = []
    const list = listRef.current
    if (!list) {
      previous.current = { positions: new Map(), horizontal, ids: [] }
      return
    }

    // Measure in scroll-content coordinates so scrolling and dock movement
    // don't turn into unintended thumbnail animations.
    const bounds = list.getBoundingClientRect()
    const items = Array.from(list.querySelectorAll('[data-variation-id]'), (element) => {
      const box = element.getBoundingClientRect()
      return {
        id: element.dataset.variationId,
        element,
        x: box.left - bounds.left + list.scrollLeft,
        y: box.top - bounds.top + list.scrollTop,
      }
    })
    if (before.horizontal === horizontal) {
      animations.current = animateVariationChanges(items, before.positions, {
        horizontal,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      })
    }
    previous.current = {
      positions: new Map(items.map(({ id, x, y }) => [id, { x, y }])),
      horizontal,
      ids,
    }
  }, [results, horizontal])

  return listRef
}
