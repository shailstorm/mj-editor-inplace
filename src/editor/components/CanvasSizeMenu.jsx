import { useEffect, useId, useRef, useState } from 'react'
import { CANVAS_PROPORTIONS } from '../model/canvas.js'

export default function CanvasSizeMenu({ value = 'original', onChange, placement = 'bottom', maxHeight, className = '', style }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const menuId = useId()
  const selectedIndex = Math.max(0, CANVAS_PROPORTIONS.findIndex((option) => option.id === value))

  useEffect(() => {
    if (!open) return
    optionRefs.current[selectedIndex]?.focus()
    function dismissOutside(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismissOutside)
    return () => document.removeEventListener('pointerdown', dismissOutside)
  }, [open, selectedIndex])

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function handleOptionKey(event, index) {
    const last = CANVAS_PROPORTIONS.length - 1
    const next = {
      ArrowDown: (index + 1) % (last + 1),
      ArrowUp: (index + last) % (last + 1),
      Home: 0,
      End: last,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    optionRefs.current[next]?.focus()
  }

  return (
    <div
      className={`canvas-size-control ${className}`}
      style={style}
      data-placement={placement}
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        // Keep editor shortcuts from changing tools or clearing the region.
        event.stopPropagation()
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          close()
        }
      }}
    >
      <button
        type="button"
        className="canvas-size-trigger floating"
        ref={triggerRef}
        aria-label={`Canvas proportions: ${CANVAS_PROPORTIONS[selectedIndex].label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <img className="asset" src="/icons/proportions.svg" alt="" draggable="false" />
        <svg className="canvas-size-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="canvas-size-menu floating" style={{ maxHeight }} id={menuId} role="menu" aria-label="Canvas proportions">
          {CANVAS_PROPORTIONS.map((option, index) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={CANVAS_PROPORTIONS[selectedIndex].id === option.id}
              className="canvas-size-option"
              ref={(node) => { optionRefs.current[index] = node }}
              tabIndex={-1}
              onKeyDown={(event) => handleOptionKey(event, index)}
              onClick={() => {
                onChange(option.id)
                close()
              }}
            >
              <span className="canvas-proportion-preview" aria-hidden="true">
                <span style={{
                  aspectRatio: `${option.width} / ${option.height}`,
                  width: option.width >= option.height ? 24 : undefined,
                  height: option.width < option.height ? 26 : undefined,
                }} />
              </span>
              <span>{option.label}</span>
              {CANVAS_PROPORTIONS[selectedIndex].id === option.id && (
                <svg className="canvas-size-selected" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="m3 6 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
