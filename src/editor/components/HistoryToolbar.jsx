import { IconButton } from './Icon.jsx'

export default function HistoryToolbar({ canUndo, canRedo, onUndo, onRedo }) {
  return (
    <div className="tool-group history-toolbar" role="group" aria-label="Edit history">
      <IconButton label="Undo (⌘Z)" name="LucideUndo2" collection="prompting" onClick={onUndo} disabled={!canUndo} />
      <IconButton label="Redo (⇧⌘Z)" name="LucideRedo2" collection="prompting" onClick={onRedo} disabled={!canRedo} />
    </div>
  )
}
