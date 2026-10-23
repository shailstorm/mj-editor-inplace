import { Asset } from './Icon.jsx'
import MobileNavigation from './MobileNavigation.jsx'

const ITEMS = [
  { icon: 'Compass', label: 'Explore' },
  { icon: 'Create', label: 'Create' },
  { icon: 'Edit', label: 'Editor' },
  { icon: 'Grid', label: 'Organize' },
  { icon: 'ColorSwatchIcon', label: 'Personalize' },
  { icon: 'Moodboard', label: 'Moodboards' },
  { icon: 'Palette', label: 'Style creator' },
  { icon: 'ThumbsUp', label: 'Tasks' },
]

const BOTTOM_ITEMS = [
  { icon: 'CircleQuestion', label: 'Help and keyboard shortcuts' },
  { icon: 'BellIcon', label: 'Notifications' },
  { icon: 'SunIcon', label: 'Appearance' },
  { icon: 'UserCircleIcon', label: 'Account', className: 'account' },
]

function NavigationIcon({ icon, label, className = '' }) {
  return (
    <span className={`nav-icon ${className}`} role="img" aria-label={label}>
      <Asset name={icon} />
    </span>
  )
}

export default function Navigation({ mobile = false } = {}) {
  if (mobile) return <MobileNavigation />
  return (
    <nav className="navigation" aria-label="Main navigation" aria-disabled="true">
      <span className="brand" aria-label="Midjourney">
        MJ
      </span>
      <div className="nav-items">
        {ITEMS.map((item) => (
          <NavigationIcon
            key={item.icon}
            label={item.label}
            icon={item.icon}
            className={`nav-item ${item.icon === 'Edit' ? 'active' : ''}`}
          />
        ))}
      </div>
      <div className="nav-bottom">
        {BOTTOM_ITEMS.map((item) => <NavigationIcon key={item.icon} {...item} />)}
      </div>
    </nav>
  )
}
