import { workspaceBox } from '../model/layout.js'
import { boxStyle } from '../model/geometry.js'
import { cropInsets } from '../model/image-transforms.js'

export default function SourceImage({ document, layout, cropDraft, onSelect, onImageLoad }) {
  const { image } = document
  if (!image) return null
  const frame = cropDraft?.sourceFrame ?? document.imageFrame
  const crop = cropDraft?.box ?? document.imageCrop
  const selected = document.selected.includes(document.imageId)
  const displayed = workspaceBox(frame, layout)
  const imageStyle = {
    left: displayed.x - layout.canvas.x,
    top: displayed.y - layout.canvas.y,
    width: displayed.width,
    height: displayed.height,
  }

  return (
    <>
      <div className="image-canvas" aria-label="Image canvas" style={boxStyle(layout.canvas)} />
      <div className="canvas-image-clip" style={boxStyle(layout.canvas)}>
        <img
          className="source-image"
          data-image={document.imageId}
          role="button"
          tabIndex={0}
          aria-label="Select source image"
          aria-pressed={selected}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            onSelect(document.imageId)
          }}
          src={image}
          alt="Image being edited"
          draggable="false"
          onLoad={(event) => onImageLoad?.(document.imageId, image, {
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          })}
          style={{
            ...imageStyle,
            clipPath: cropDraft ? undefined : cropInsets(frame, crop),
            opacity: cropDraft ? 0.25 : 1,
          }}
        />
        {cropDraft && (
          <img
            className="source-image crop-preview-image"
            src={image}
            alt=""
            aria-hidden="true"
            draggable="false"
            style={{ ...imageStyle, clipPath: cropInsets(frame, crop) }}
          />
        )}
      </div>
    </>
  )
}
