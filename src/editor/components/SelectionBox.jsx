import { boxStyle } from '../model/geometry.js'

export default function SelectionBox({
  box,
  children,
  className = '',
  resizeTarget,
  movable = false,
  handles = true,
  dashed = false,
  handlePositions = ['nw', 'ne', 'sw', 'se'],
}) {
  if (!box) return null
  return (
    <div
      className={`selection-box ${className}${movable ? ' is-movable' : ''}${dashed ? ' has-dashed-outline' : ''}`}
      style={boxStyle(box)}
      data-region-move={movable ? 'true' : undefined}
    >
      {dashed && (
        <svg className="selection-outline" aria-hidden="true">
          <rect width="100%" height="100%" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {children}
      {handles &&
        handlePositions.map((corner) => (
          <span
            className={`selection-handle ${corner}`}
            key={corner}
            data-corner={corner}
            data-resize-corner={resizeTarget ? corner : undefined}
            data-resize-target={resizeTarget}
          />
        ))}
    </div>
  )
}
