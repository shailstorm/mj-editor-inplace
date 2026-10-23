import { Asset } from './Icon.jsx'

export default function MobileNavigation() {
  return (
    <nav className="mobile-navigation" aria-label="Main navigation" aria-disabled="true">
      <span className="mobile-nav-item" role="img" aria-label="Menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 6h14M5 12h14M5 18h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span>Menu</span>
      </span>
      <span className="mobile-nav-item" role="img" aria-label="Explore">
        <Asset name="Compass" />
        <span>Explore</span>
      </span>
      <span className="mobile-nav-item active" role="img" aria-label="Create">
        <span className="mobile-create-icon" aria-hidden="true" />
        <span>Create</span>
      </span>
      <span className="mobile-nav-item" role="img" aria-label="Organize">
        <Asset name="Grid" />
        <span>Organize</span>
      </span>
    </nav>
  )
}
