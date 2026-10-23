import { useVariationMotion } from '../hooks/useVariationMotion.js'

const HEART_PATH = 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z'

export default function ResultImages({ results, onEdit, onToggleFavorite, headerAction, horizontal = false }) {
  const listRef = useVariationMotion(results, horizontal)
  if (!results.length) return null
  const newestFirst = results.slice().reverse()

  return (
    <aside className="variations" aria-label="Image variations">
      <div className="variations-header">
        {headerAction}
        <p>Variations</p>
      </div>
      <div className="variation-list" ref={listRef}>
        {newestFirst.map((result, index) => (
          <div
            key={result.id}
            className="variation-thumbnail"
            data-variation-id={result.id}
          >
            <button
              type="button"
              className="variation-open"
              aria-label={`Edit variation ${index + 1}${result.favorite ? ' (favorite)' : ''}`}
              onClick={() => onEdit(result.id)}
            >
              <img src={result.src} alt="" draggable="false" />
            </button>
            <button
              type="button"
              className="variation-favorite"
              aria-label={`${result.favorite ? 'Remove' : 'Add'} variation ${index + 1} ${result.favorite ? 'from' : 'to'} favorites`}
              aria-pressed={Boolean(result.favorite)}
              onClick={() => onToggleFavorite(result.id)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d={HEART_PATH} fill={result.favorite ? '#ff533e' : 'none'} stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}

