import { useEffect, useRef } from 'react'
import { useViewportSize } from './hooks/useViewportSize.js'
import { useImageGestures } from './hooks/useImageGestures.js'
import { useEditor } from './hooks/useEditor.js'
import { useEditorShortcuts } from './hooks/useEditorShortcuts.js'
import { useToast } from './hooks/useToast.js'
import { imageLayout } from './model/layout.js'
import Navigation from './components/Navigation.jsx'
import ImageWorkspace from './components/ImageWorkspace.jsx'
import ResultImages from './components/ResultImages.jsx'
import PromptPanel from './components/PromptPanel.jsx'
import CollapsiblePromptPanel from './components/CollapsiblePromptPanel.jsx'
import Topbar from './components/Topbar.jsx'
import CanvasProportions from './components/CanvasProportions.jsx'
import Toolbar from './components/Toolbar.jsx'
import ProjectsDialog from './components/ProjectsDialog.jsx'
import HelpDialog from './components/HelpDialog.jsx'
import HelpButton from './components/HelpButton.jsx'
import ImageFileInput from './components/ImageFileInput.jsx'
import './styles/editor.css'

export default function Editor() {
  const viewport = useViewportSize()
  const toast = useToast()
  const editor = useEditor({ notify: toast.notify })
  const { document, history, actions, tool, panel, setPanel } = editor
  const layout = imageLayout(document, viewport)
  const isMobile = layout.navWidth === 0
  const promptRef = useRef(null)
  const uploadRef = useRef(null)
  const referenceRef = useRef(null)
  const closePanels = () => setPanel(null)
  const openReferencePicker = () => referenceRef.current?.click()

  useEffect(() => {
    if (editor.promptOpen) promptRef.current?.focus()
  }, [editor.promptOpen])

  const gestures = useImageGestures({
    document,
    history,
    actions,
    tool,
    layout,
    cropDraft: editor.cropDraft,
    closePanel: closePanels,
  })

  useEffect(() => {
    if (!editor.cropDraft) return
    function applyOutsidePhoto(event) {
      if (event.button !== 0) return
      if (event.target.closest('[data-image],[data-resize-target="crop"],[data-tool="crop"]')) return
      actions.applyCrop()
    }
    window.document.addEventListener('pointerdown', applyOutsidePhoto, true)
    return () => window.document.removeEventListener('pointerdown', applyOutsidePhoto, true)
  }, [editor.cropDraft, actions])

  useEditorShortcuts({
    hasImage: Boolean(document.image),
    actions,
    setTool: actions.selectTool,
    closePanels,
    cancelGesture: gestures.cancelGesture,
    completePrompt: () => {
      promptRef.current?.focus()
      // A shortcut outside the field must not replace an existing draft.
      if (!document.prompt.trim()) actions.applySuggestion()
    },
  })

  function togglePanel(name) {
    setPanel((current) => (current === name ? null : name))
  }

  const promptProps = {
    document,
    inputRef: promptRef,
    busy: editor.busy,
    isSelectingRegion: gestures.isSelectingRegion,
    promptCompletion: editor.promptCompletion,
    actions,
    closePanels,
    openReferencePicker,
  }

  return (
    <main
      className={`viewport${layout.stacked ? ' is-stacked' : ''}${isMobile ? ' is-mobile' : ''}`}
      style={{
        '--nav-width': `${layout.navWidth}px`,
        '--bottom-nav-height': `${layout.bottomNavHeight}px`,
        '--bottom-variations-height': `${layout.bottomVariationsHeight}px`,
        '--bottom-dock-height': `${layout.bottomDockHeight}px`,
        '--editor-inset': `${layout.gutter}px`,
        '--panel-top': `${layout.panelTop}px`,
      }}
      aria-label="Midjourney image editor"
      data-history={history.undoCount}
    >
      <Navigation mobile={isMobile} />
      <ImageWorkspace
        document={document}
        layout={layout}
        tool={tool}
        boardRef={gestures.boardRef}
        isSelectingRegion={gestures.isSelectingRegion}
        pointerHandlers={gestures.pointerHandlers}
        actions={actions}
        cropDraft={editor.cropDraft}
      >
        <CanvasProportions
          box={layout.proportions}
          value={document.canvasProportion}
          onChange={(id) => {
            gestures.cancelGesture()
            actions.setCanvasProportion(id)
          }}
        />
        {!layout.stacked && <PromptPanel {...promptProps} />}
      </ImageWorkspace>
      <ResultImages
        horizontal={isMobile}
        results={document.results}
        onEdit={actions.editResult}
        onToggleFavorite={actions.toggleFavorite}
        headerAction={!isMobile && <HelpButton open={panel === 'help'} onClick={() => setPanel('help')} />}
      />
      <Topbar
        toggleProjects={() => togglePanel('projects')}
        mobile={layout.stacked}
        prompt={layout.stacked && <CollapsiblePromptPanel {...promptProps} />}
        help={layout.stacked && (isMobile || !document.results.length) && <HelpButton open={panel === 'help'} onClick={() => setPanel('help')} />}
      />
      <div className="editor-toolbar" data-editor-controls="" style={{ left: layout.toolbar.x, top: layout.toolbar.y, width: layout.toolbar.width }}>
        <Toolbar tool={tool} onSelect={actions.selectTool} history={history} onUndo={actions.undo} onRedo={actions.redo} />
      </div>
      {!layout.stacked && !document.results.length && (
        <div className="help-corner">
          <HelpButton open={panel === 'help'} onClick={() => setPanel('help')} />
        </div>
      )}
      {panel === 'projects' && (
        <ProjectsDialog
          onClose={closePanels}
          onUpload={() => uploadRef.current?.click()}
          image={document.image ?? document.results[0]?.src}
        />
      )}
      {panel === 'help' && <HelpDialog onClose={closePanels} />}
      {toast.message && (
        <div className="toast" role="status">
          {toast.message}
        </div>
      )}
      <ImageFileInput inputRef={uploadRef} onFiles={actions.upload} />
      <ImageFileInput
        inputRef={referenceRef}
        multiple
        onFiles={(files) => actions.upload(files, true)}
      />
    </main>
  )
}
