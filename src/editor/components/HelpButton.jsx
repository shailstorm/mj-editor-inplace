import { IconButton } from './Icon.jsx'

export default function HelpButton({ open, onClick }) {
  return (
    <IconButton
      label="Help and keyboard shortcuts"
      name="CircleQuestion"
      className="help-button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onClick}
    />
  )
}
