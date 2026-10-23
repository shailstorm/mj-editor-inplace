import { useId, useState } from 'react'
import PromptPanel from './PromptPanel.jsx'

export default function CollapsiblePromptPanel(props) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()

  return (
    <PromptPanel
      {...props}
      compact
      expanded={expanded}
      detailsId={detailsId}
      onToggle={() => setExpanded((current) => !current)}
    />
  )
}
