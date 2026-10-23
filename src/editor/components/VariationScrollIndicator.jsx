import { useLayoutEffect, useRef } from 'react'

export default function VariationScrollIndicator({ listRef, itemCount }) {
  const indicatorRef = useRef(null)

  useLayoutEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return

    function update() {
      const overflow = list.scrollWidth - list.clientWidth
      indicator.hidden = overflow <= 1
      if (indicator.hidden) return

      const width = Math.max(8, list.clientWidth / list.scrollWidth * 100)
      // Clamp Safari's elastic overscroll so the thumb stays inside its track.
      const progress = Math.max(0, Math.min(1, list.scrollLeft / overflow))
      indicator.style.setProperty('--scroll-thumb-width', `${width}%`)
      indicator.style.setProperty('--scroll-thumb-left', `${progress * (100 - width)}%`)
    }

    update()
    list.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(list)
    return () => {
      list.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [listRef, itemCount])

  return (
    <div className="variation-scroll-indicator" ref={indicatorRef} aria-hidden="true" hidden>
      <span />
    </div>
  )
}
