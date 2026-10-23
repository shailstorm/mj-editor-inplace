import { boxStyle } from '../model/geometry.js'
import { workspaceBox } from '../model/layout.js'

export default function RegionMask({ region, frame, layout, drawing = false }) {
  return (
    <svg
      className={`region-mask${drawing ? ' is-drawing' : ''}`}
      style={boxStyle(workspaceBox(frame, layout))}
      viewBox={`0 0 ${region.outline.width} ${region.outline.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={region.outline.path} fillRule="evenodd" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
