import { useEffect } from 'react'
import { TOOLS } from '../model/tools.js'

export function useEditorShortcuts({
  hasImage,
  actions,
  setTool,
  closePanels,
  cancelGesture,
  completePrompt,
}) {
  useEffect(() => {
    function keydown(event) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return
      const key = event.key.toLowerCase()
      const command = event.metaKey || event.ctrlKey

      if (command && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) actions.redo()
        else actions.undo()
        return
      }
      if (command && key === 'a' && hasImage) {
        event.preventDefault()
        actions.selectAll()
        return
      }
      if (event.key === 'Escape') {
        cancelGesture()
        if (actions.cancelCrop?.()) return
        closePanels()
        actions.clearSelection()
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        actions.deleteSelected()
      }
      const tool = TOOLS.find((item) => item.shortcut.toLowerCase() === key)
      if (tool && !command && !event.altKey) setTool(tool.id)
      if (event.key === '/' && !command && !event.altKey && !event.repeat) {
        event.preventDefault()
        completePrompt()
      }
    }

    window.addEventListener('keydown', keydown)
    return () => {
      window.removeEventListener('keydown', keydown)
    }
  }, [hasImage, actions, setTool, closePanels, cancelGesture, completePrompt])
}
