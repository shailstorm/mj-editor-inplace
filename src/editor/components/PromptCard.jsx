import { promptStyle } from '../model/layout.js'
import { IconButton } from './Icon.jsx'
import ReferenceImages from './ReferenceImages.jsx'
import SendIcon from './SendIcon.jsx'
import PromptCompletion from './PromptCompletion.jsx'
import { selectedRegion } from '../model/selection.js'

export default function PromptCard({
  document,
  viewport,
  layout,
  inputRef,
  busy,
  isSelectingRegion = false,
  promptOpen = false,
  promptCompletion,
  actions,
  closePanels,
  openReferencePicker,
}) {
  if (isSelectingRegion || selectedRegion(document) || !document.selected.length || !promptOpen)
    return null
  const expanded = document.references.length > 0

  function submit(event) {
    event.preventDefault()
    actions.generate()
  }

  function keydown(event) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    closePanels?.()
    event.currentTarget.blur()
  }

  function addReference() {
    openReferencePicker()
  }

  return (
    <form
      className={`prompt-card floating ${expanded ? 'expanded' : ''} ${busy ? 'is-busy' : ''}`}
      style={promptStyle(document, viewport, layout)}
      onSubmit={submit}
    >
      <div className="prompt-row">
        <IconButton label="Add reference image" name="AddImageUncentered" onClick={addReference} />
        <PromptCompletion value={document.prompt} completion={promptCompletion} inputRef={inputRef} onFinish={actions.finishPromptCompletion}>
          <input
            ref={inputRef}
            aria-label="Describe your edit"
            placeholder="Type '/' for suggestions"
            value={document.prompt}
            onChange={(event) => actions.setPrompt(event.target.value, event.nativeEvent)}
            onKeyDown={keydown}
          />
        </PromptCompletion>
        <button
          className="send-button"
          aria-label={busy ? 'Generating preview' : 'Generate variations'}
          title="Generate variations"
          disabled={busy}
        >
          {busy ? <span className="spinner" /> : <SendIcon active={Boolean(document.prompt)} />}
        </button>
      </div>
      {expanded && (
        <ReferenceImages
          images={document.references}
          onUpload={openReferencePicker}
          onRemove={actions.removeReference}
        />
      )}
    </form>
  )
}
