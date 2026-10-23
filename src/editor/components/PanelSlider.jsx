export default function PanelSlider({
  label, value, valueText, onChange, centered = false, min = 0, max = 100, disabled = false,
}) {
  const position = value / 100
  return (
    <div
      className={`panel-slider${centered ? ' panel-slider--centered' : ''}`}
      data-disabled={disabled || undefined}
      style={{
        '--slider-value': position,
        // Keep the native drag area aligned with the enabled part of the track.
        '--slider-input-start': min / 100,
        '--slider-input-span': (max - min) / 100,
        ...(centered && {
          '--slider-fill-start': Math.min(0.5, position),
          '--slider-fill-length': Math.abs(position - 0.5),
        }),
      }}
    >
      <div className="panel-slider-track" aria-hidden="true">
        <div className="panel-slider-fill" />
        <div className="panel-slider-knob" />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={valueText ?? `${value}%`}
        onChange={(event) => {
          if (!disabled) onChange(Math.max(min, Math.min(max, Number(event.target.value))))
        }}
      />
    </div>
  )
}
