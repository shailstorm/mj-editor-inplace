export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function rectangle(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
}

export function boxStyle(box) {
  return { left: box.x, top: box.y, width: box.width, height: box.height }
}

// Reverse the display-only fit to keep selection coordinates in document space.
export function documentPoint(point, workspaceRect, layout) {
  return {
    x: (point.x - workspaceRect.left - layout.x) / layout.scale,
    y: (point.y - workspaceRect.top - layout.y) / layout.scale,
  }
}

export function imagePoint(point, frame, imageSize) {
  return {
    x: ((point.x - frame.x) * imageSize.width) / frame.width,
    y: ((point.y - frame.y) * imageSize.height) / frame.height,
  }
}
