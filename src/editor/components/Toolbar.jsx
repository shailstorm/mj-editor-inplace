import { TOOLS, toolIconCollection } from '../model/tools.js'
import { IconButton } from './Icon.jsx'
import HistoryToolbar from './HistoryToolbar.jsx'

export default function Toolbar({ tool, onSelect, history = {}, onUndo, onRedo }) {
  return (
    <div className="toolbar floating" role="toolbar" aria-label="Editor tools">
      <div className="tool-group toolbar-tools">
        {TOOLS.map(({ id, icon, label, shortcut }) => (
          <IconButton
            key={id}
            label={`${label} (${shortcut})`}
            name={'Lucide' + icon}
            collection={toolIconCollection(id, tool === id)}
            className={`tool-button ${tool === id ? 'selected' : ''}`}
            aria-pressed={tool === id}
            data-tool={id}
            title={id === 'crop' ? undefined : `${label} (${shortcut})`}
            onClick={() => onSelect(id)}
          />
        ))}
      </div>
      <HistoryToolbar canUndo={history.canUndo} canRedo={history.canRedo} onUndo={onUndo} onRedo={onRedo} />
    </div>
  )
}
