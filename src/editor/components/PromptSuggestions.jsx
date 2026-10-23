import { SAMPLE_PROMPT } from '../model/assets.js'

export default function PromptSuggestions({ onApply, type = 'region' }) {
  return (
    <div className="suggestions floating">
      <p>{type === 'image' ? 'Try an image edit' : 'Try a region edit'}</p>
      <button type="button" onClick={onApply}>
        {SAMPLE_PROMPT}
        <span>Use this prompt ↵</span>
      </button>
    </div>
  )
}
