export default function Dialog({ label, title, closeLabel, className, onClose, children }) {
  return (
    <div className="panel-scrim" onClick={onClose}>
      <section
        className={`${className} floating`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-heading">
          <h1>{title}</h1>
          <button type="button" className="panel-close-button" aria-label={closeLabel} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m4 4 16 16M20 4 4 20" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
