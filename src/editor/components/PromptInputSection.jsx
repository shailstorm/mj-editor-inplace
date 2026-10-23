import PanelHeading from './PanelHeading.jsx'
import PromptSuggestions from './PromptSuggestions.jsx'

export default function PromptInputSection({
  type, value, inputRef, suggestionsOpen, onChange, onApplySuggestion, closeSuggestions,
  disclosure,
}) {
  const labelId = `${type}-prompt-label`

  function applySuggestion() {
    onApplySuggestion()
    inputRef.current?.focus()
  }

  return (
    <section className="prompt-panel-section prompt-panel-input">
      <PanelHeading id={labelId} action={disclosure}>{type === 'image' ? 'Image Prompt' : 'Region Prompt'}</PanelHeading>
      <input
        ref={inputRef}
        aria-labelledby={labelId}
        placeholder="Type '/' for suggestions"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.stopPropagation()
          closeSuggestions()
          event.currentTarget.blur()
        }}
      />
      {suggestionsOpen && <PromptSuggestions type={type} onApply={applySuggestion} />}
    </section>
  )
}
