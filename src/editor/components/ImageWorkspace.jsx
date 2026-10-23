import { selectedImages, selectedRegion } from '../model/selection.js'
import { workspaceBox, regionBounds } from '../model/layout.js'
import SourceImage from './SourceImage.jsx'
import SelectionBox from './SelectionBox.jsx'
import RegionMask from './RegionMask.jsx'
import { visibleImageFrame } from '../model/image-transforms.js'

export default function ImageWorkspace({
  document,
  layout,
  tool,
  boardRef,
  isSelectingRegion = false,
  pointerHandlers,
  actions,
  cropDraft,
  children,
}) {
  const imageSelected = selectedImages(document).length > 0
  const frame = visibleImageFrame(document)
  const region = selectedRegion(document)
  const maskedRegion = region?.outline
  const rectangleEditable = region && !maskedRegion && tool === 'rectangle' && !isSelectingRegion
  const imageEditable = imageSelected && !region && tool === 'cursor'
  const selectionBox = imageSelected
    ? regionBounds(region, frame) ?? frame
    : null

  return (
    <section
      ref={boardRef}
      className={`workspace tool-${tool}`}
      aria-label="Image workspace"
      {...pointerHandlers}
    >
      <SourceImage document={document} layout={layout} cropDraft={cropDraft} onSelect={actions.selectImage} onImageLoad={actions.setImageDimensions} />
      {cropDraft ? (
        <SelectionBox
          box={workspaceBox(cropDraft.box, layout)}
          className="crop-selection"
          resizeTarget="crop"
          handlePositions={['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']}
        >
          <div className="crop-grid" aria-hidden="true" />
        </SelectionBox>
      ) : maskedRegion ? (
        <RegionMask
          region={region}
          frame={frame}
          layout={layout}
          drawing={isSelectingRegion}
        />
      ) : (
        <SelectionBox
          box={workspaceBox(selectionBox, layout)}
          className={region ? 'region-selection' : 'image-selection'}
          dashed={Boolean(region)}
          handles={Boolean(rectangleEditable || imageEditable)}
          resizeTarget={imageEditable ? 'image' : rectangleEditable ? 'region' : undefined}
          movable={Boolean(rectangleEditable)}
        />
      )}
      {!document.image && (
        <p className="workspace-empty">Upload an image or choose a variation to edit.</p>
      )}
      {children}
    </section>
  )
}
