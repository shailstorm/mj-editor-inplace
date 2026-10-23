import { useEffect, useId, useRef, useState } from 'react'
import PromptPanel from './PromptPanel.jsx'

export default function CollapsiblePromptPanel(props) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!expanded) return
    function collapseOutside(event) {
      if (!panelRef.current?.contains(event.target)) setExpanded(false)
    }
    document.addEventListener('pointerdown', collapseOutside, true)
    return () => document.removeEventListener('pointerdown', collapseOutside, true)
  }, [expanded])

  return (
    <PromptPanel
      {...props}
      compact
      formRef={panelRef}
      expanded={expanded}
      detailsId={detailsId}
      onToggle={() => setExpanded((current) => !current)}
    />
  )
}
