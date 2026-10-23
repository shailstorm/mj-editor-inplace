import { MAX_REFERENCES } from '../model/references.js'
import { regionPanelAssets } from '../model/region-panel.js'
import PanelHeading from './PanelHeading.jsx'
import ReferencePhoto from './ReferencePhoto.jsx'
import { chatboxAssets } from '../model/chatbox.js'

export default function PromptReferences({ references, onUpload, onRemove, onWeightChange, compact = false }) {
  return (
    <section className="prompt-panel-section prompt-references" aria-label="Prompt references">
      <div className="prompt-reference-images">
        <PanelHeading infoIcon={compact ? chatboxAssets.info : undefined} info="Edit or combine images, or use the style or elements of an image. Slide the dial to adjust how much the image influences the result.">References</PanelHeading>
        <div className="prompt-image-grid">
          <button
            type="button"
            className="prompt-add-reference"
            aria-label="Upload reference"
            onClick={onUpload}
            disabled={references.length >= MAX_REFERENCES}
          >
            <img src={compact ? chatboxAssets.plus : regionPanelAssets.plus} alt="" draggable="false" />
          </button>
          {references.map((reference, index) => (
            <ReferencePhoto
              key={reference.id}
              reference={reference}
              index={index}
              onRemove={onRemove}
              onWeightChange={onWeightChange}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
