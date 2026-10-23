import assets from '../../figma-assets.json'

export function Asset({ name, collection = 'selection', className = '' }) {
  return (
    <img
      className={`asset ${className}`}
      src={assets[collection]['img' + name]}
      alt=""
      draggable="false"
    />
  )
}

export function IconButton({ label, name, collection, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-button ${className}`}
      {...props}
    >
      <Asset name={name} collection={collection} />
    </button>
  )
}
