export const TOOLS = [
  { id: 'cursor', icon: 'MousePointer2', label: 'Select', shortcut: 'V' },
  { id: 'rectangle', icon: 'SquareDashed', label: 'Rectangle selection', shortcut: 'M' },
  { id: 'lasso', icon: 'LassoSelect', label: 'Lasso selection', shortcut: 'L' },
  { id: 'auto', icon: 'WandSparkles', label: 'Magic wand', shortcut: 'W' },
  { id: 'crop', icon: 'Crop', label: 'Crop image', shortcut: 'C' },
]

// Figma exports separate light and dark icons for these two tool states.
export function toolIconCollection(id, selected) {
  if (id === 'lasso') return selected ? 'selection' : 'prompting'
  if (id === 'auto') return selected ? 'prompting' : 'selection'
  return 'selection'
}
