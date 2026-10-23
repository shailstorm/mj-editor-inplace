import { sampleReferences } from '../model/assets.js'
import { Asset } from './Icon.jsx'

function sampleClass(src) {
  if (src === sampleReferences[0]) return 'reference-pink'
  if (src === sampleReferences[1]) return 'reference-shoes'
  return ''
}

export default function ReferenceImages({ images, onUpload, onRemove }) {
  if (!images.length) return null

  return (
    <div className="references">
      <div className="reference-heading">
        References <Asset name="LucideInfo" collection="prompting" />
      </div>
      <div className="reference-images">
        <button
          type="button"
          className="add-reference"
          aria-label="Upload reference"
          onClick={onUpload}
        >
          <Asset name="Vector" collection="prompting" />
        </button>
        {images.map(({ id, src }, index) => (
          <div className={`reference-image ${sampleClass(src)}`} key={id}>
            <img src={src} alt={`Boot reference ${index + 1}`} />
            <button
              type="button"
              aria-label={`Remove reference ${index + 1}`}
              className="remove-reference"
              onClick={() => onRemove(index)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
