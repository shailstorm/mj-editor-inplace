const timing = { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }

export function animateVariationChanges(items, previous, { horizontal = false, reducedMotion = false } = {}) {
  if (reducedMotion || !items.some((item) => !previous.has(item.id))) return []
  const animations = []
  let entering = 0
  for (const { id, element, x, y } of items) {
    if (!element.animate) continue
    const before = previous.get(id)
    if (before) {
      const offset = horizontal ? before.x - x : before.y - y
      if (!offset) continue
      animations.push(element.animate([
        { transform: `${horizontal ? 'translateX' : 'translateY'}(${offset}px)` },
        { transform: 'translate(0, 0)' },
      ], timing))
    } else {
      animations.push(element.animate([
        { opacity: 0, transform: horizontal ? 'translateX(-8px)' : 'translateY(-8px)' },
        { opacity: 1, transform: 'translate(0, 0)' },
      ], { ...timing, delay: Math.min(entering++ * 20, 60), fill: 'backwards' }))
    }
  }
  return animations
}
