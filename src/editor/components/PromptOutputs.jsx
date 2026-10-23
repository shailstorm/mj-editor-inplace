import { useState } from 'react'
import PanelHeading from './PanelHeading.jsx'

export default function PromptOutputs({ type, results, onEdit, onFavorite }) {
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState([])
  const favoriteIds = results.filter((result) => !selecting || selected.includes(result.id)).map((result) => result.id)

  function addFavorites() {
    if (!favoriteIds.length) return
    onFavorite(favoriteIds)
    setSelected([])
    setSelecting(false)
  }

  function choose(id) {
    if (!selecting) return onEdit(id)
    setSelected((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id])
  }

  return (
    <section className="prompt-panel-section prompt-output" aria-label={`${type === 'image' ? 'Image' : 'Region'} output`}>
      <PanelHeading action={
        <button
          type="button"
          className="prompt-output-select"
          aria-pressed={selecting}
          onClick={() => setSelecting((current) => !current)}
        >{selecting ? 'Cancel' : 'Select'}</button>
      }>Output</PanelHeading>
      <div className="prompt-image-grid">
        {results.map((result, index) => (
          <button
            type="button"
            key={result.id}
            className={`prompt-image-button prompt-output-image${selecting ? ' is-selecting' : ''}`}
            aria-label={`${selecting ? 'Select' : 'Edit'} output ${index + 1}`}
            aria-pressed={selecting ? selected.includes(result.id) : undefined}
            onClick={() => choose(result.id)}
          >
            <img src={result.src} alt={`Generated output ${index + 1}`} draggable="false" />
            {selecting && <span className="prompt-output-check" aria-hidden="true">
              {selected.includes(result.id) && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="m3 6 2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>}
          </button>
        ))}
      </div>
      <button type="button" className="prompt-panel-primary" disabled={!favoriteIds.length} onClick={addFavorites}>
        Favorite {favoriteIds.length} {favoriteIds.length === 1 ? 'image' : 'images'}
      </button>
    </section>
  )
}
