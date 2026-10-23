import CanvasSizeMenu from './CanvasSizeMenu.jsx'

export default function CanvasProportions({ box, value, onChange }) {
  return (
    <div className="canvas-proportions" data-editor-controls="" style={{ left: box.x, top: box.y }}>
      <CanvasSizeMenu value={value} onChange={onChange} placement={box.placement} maxHeight={box.maxHeight} />
    </div>
  )
}
