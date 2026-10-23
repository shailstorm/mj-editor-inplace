import { useEffect, useState } from 'react'

function readViewport() {
  const safeAreaBottom = typeof document === 'undefined' ? 0
    : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom')) || 0
  const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  return { width: innerWidth, height: innerHeight, safeAreaBottom, coarsePointer }
}

export function useViewportSize() {
  const [viewport, setViewport] = useState(readViewport)

  useEffect(() => {
    const resize = () => setViewport(readViewport())
    window.addEventListener('resize', resize)
    const pointerQuery = window.matchMedia?.('(pointer: coarse)')
    pointerQuery?.addEventListener('change', resize)
    return () => {
      window.removeEventListener('resize', resize)
      pointerQuery?.removeEventListener('change', resize)
    }
  }, [])

  return viewport
}
