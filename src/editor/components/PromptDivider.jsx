import { regionPanelAssets } from '../model/region-panel.js'

export default function PromptDivider() {
  return (
    <div className="prompt-panel-divider" aria-hidden="true">
      <img src={regionPanelAssets.divider} alt="" />
    </div>
  )
}
