import PromptReferences from './PromptReferences.jsx'
import PromptOutputs from './PromptOutputs.jsx'
import PromptInputSection from './PromptInputSection.jsx'
import PromptDivider from './PromptDivider.jsx'
import AuraSection from './AuraSection.jsx'
import { canGeneratePrompt, promptType } from '../model/prompts.js'

export default function PromptPanel({
  document, inputRef, busy, isSelectingRegion = false, suggestionsOpen,
  actions, closeSuggestions, openReferencePicker,
  compact = false, expanded = false, detailsId, onToggle, formRef,
}) {
  const results = document.results.filter((result) => document.promptOutputIds.includes(result.id))
  const type = promptType(document)
  const canGenerate = canGeneratePrompt(document, { busy, selecting: isSelectingRegion })
  const generateLabel = busy ? 'Generating…' : 'Generate'
  const details = (
    <>
      <PromptDivider fluid={compact} />
      <PromptReferences
        references={document.references}
        onUpload={openReferencePicker}
        onRemove={actions.removeReference}
        onWeightChange={actions.setReferenceWeight}
      />
      <PromptDivider fluid={compact} />
      {type === 'image' && (
        <>
          <AuraSection aura={document.aura} onChange={actions.setAura} />
          <PromptDivider fluid={compact} />
        </>
      )}
      {results.length && !isSelectingRegion ? (
        <PromptOutputs key={document.promptOutputIds.join(',')} type={type} results={results} onEdit={actions.editResult} onFavorite={actions.addFavorites} />
      ) : (
        <div className="prompt-panel-section prompt-generate">
          <button className="prompt-panel-primary" disabled={!canGenerate}>
            {busy && <span className="spinner" aria-hidden="true" />}
            {generateLabel}
          </button>
        </div>
      )}
    </>
  )

  return (
    <form
      ref={formRef}
      className={`prompt-panel floating${compact ? ' prompt-panel-collapsible' : ''}${results.length ? ' has-output' : ''}`}
      aria-label={`${type === 'image' ? 'Image' : 'Region'} prompt panel`}
      data-prompt-type={type}
      aria-busy={busy}
      onSubmit={(event) => {
        event.preventDefault()
        if (canGenerate) actions.generate()
      }}
    >
      <PromptInputSection
        type={type}
        value={document.prompt}
        inputRef={inputRef}
        suggestionsOpen={suggestionsOpen}
        onChange={actions.setPrompt}
        onApplySuggestion={actions.applySuggestion}
        closeSuggestions={closeSuggestions}
        disclosure={compact && (
          <button
            type="button"
            className="prompt-panel-toggle"
            aria-label={expanded ? 'Collapse prompt options' : 'Expand prompt options'}
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={onToggle}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path className="prompt-toggle-vertical" d="M10 4v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      />
      {compact ? (
        <div
          id={detailsId}
          className="prompt-panel-details"
          data-expanded={expanded}
          aria-hidden={!expanded}
          inert={!expanded}
        >
          <div className="prompt-panel-details-inner">{details}</div>
        </div>
      ) : details}
    </form>
  )
}
