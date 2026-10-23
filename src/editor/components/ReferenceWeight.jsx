import PanelSlider from './PanelSlider.jsx'

export default function ReferenceWeight({ reference, label = 'Reference weight', onChange }) {
  if (!reference) return null
  const { weight } = reference
  return (
    <div className="reference-weight">
      <PanelSlider label={label} value={weight} onChange={(value) => onChange(reference.id, value)} />
    </div>
  )
}
