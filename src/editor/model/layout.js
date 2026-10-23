import { REGION_PANEL_WIDTH } from './region-panel.js'
import { clamp } from './geometry.js'
import { selectedRegion } from './selection.js'
import { fitCanvasBounds } from './canvas.js'

export const IMAGE_SIZE = { width: 831.96, height: 833 }
export const NAV_WIDTH = 82
export const MOBILE_NAV_HEIGHT = 68
export const MOBILE_VARIATIONS_HEIGHT = 128

export function canvasBounds(document) {
  return fitCanvasBounds(
    expansionBounds(document.expansion, document.canvasFrame ?? document.imageFrame),
    document.canvasProportion,
  )
}

// Fit only the active image into a fixed workspace. This is presentation geometry,
// never a document edit or a user-controlled pan/zoom state.
export function imageLayout(document, viewport) {
  const content = canvasBounds(document)
  const stacked = viewport.width <= 1200 || (viewport.width <= 1366 && viewport.coarsePointer === true)
  const navWidth = viewport.width < 768 ? 0 : NAV_WIDTH
  const mobile = navWidth === 0
  const toolbarHeight = 55.2
  const bottomToolbarHeight = toolbarHeight + (mobile ? 8 : 24)
  const bottomNavHeight = navWidth ? 0 : MOBILE_NAV_HEIGHT + (viewport.safeAreaBottom ?? 0)
  const bottomVariationsHeight = !navWidth && document.results.length ? MOBILE_VARIATIONS_HEIGHT : 0
  const bottomDockHeight = bottomNavHeight + bottomVariationsHeight + bottomToolbarHeight
  const gutter = navWidth ? 24 : 16
  // Reserve equal space on both sides so the canvas stays horizontally centered.
  // Desktop leaves room for the prompt; tablets also leave room for variations.
  // Horizontal reservations stay constant so the stage remains centered.
  const horizontalInset = !stacked
    ? NAV_WIDTH + 24 + REGION_PANEL_WIDTH + 24
    : navWidth ? Math.max(navWidth + gutter, 144) : gutter
  const availableWidth = Math.max(1, viewport.width - horizontalInset * 2)
  const toolbarTop = viewport.height - bottomDockHeight
  const stageTop = 24 + (stacked ? 78 : 55.2) + 16
  const stageBottom = toolbarTop - 16
  const stageHeight = Math.max(1, stageBottom - stageTop)
  const proportionsHeight = 38
  const proportionsGap = 12
  // Leave equal clearance around the canvas so it remains centered itself,
  // with room for the attached proportions control above its top-right corner.
  const proportionsSpace = proportionsHeight + proportionsGap
  const availableHeight = Math.max(1, stageHeight - proportionsSpace * 2)
  const scale = Math.min(availableWidth / content.width, availableHeight / content.height)
  const canvas = {
    x: (viewport.width - content.width * scale) / 2 - navWidth,
    y: stageTop + (stageHeight - content.height * scale) / 2,
    width: content.width * scale,
    height: content.height * scale,
  }
  const toolbarWidth = Math.min(400, viewport.width - (navWidth + gutter) * 2)
  const proportionsTop = canvas.y - proportionsSpace
  const menuGap = 10
  const aboveMenu = proportionsTop - stageTop - menuGap
  const belowMenu = stageBottom - proportionsTop - proportionsHeight - menuGap
  const menuPlacement = aboveMenu > belowMenu ? 'top' : 'bottom'
  return {
    x: canvas.x - content.x * scale,
    y: canvas.y - content.y * scale,
    scale,
    canvas,
    toolbar: {
      x: (viewport.width - toolbarWidth) / 2,
      y: toolbarTop,
      width: toolbarWidth,
    },
    stage: { top: stageTop, bottom: stageBottom },
    proportions: {
      x: canvas.x + canvas.width,
      y: proportionsTop,
      placement: menuPlacement,
      maxHeight: Math.max(40, menuPlacement === 'top' ? aboveMenu : belowMenu),
    },
    stacked,
    navWidth,
    bottomNavHeight,
    bottomVariationsHeight,
    bottomToolbarHeight,
    bottomDockHeight,
    gutter,
    panelTop: stacked ? 24 : 88,
  }
}

export function workspaceBox(box, layout) {
  if (!box) return null
  return {
    x: layout.x + box.x * layout.scale,
    y: layout.y + box.y * layout.scale,
    width: box.width * layout.scale,
    height: box.height * layout.scale,
  }
}

export function regionBounds(region, frame) {
  if (!region) return null
  const ratio = frame.width / IMAGE_SIZE.width
  return {
    x: frame.x + region.x * ratio,
    y: frame.y + region.y * ratio,
    width: region.width * ratio,
    height: region.height * ratio,
  }
}

export function expansionBounds(margin, frame) {
  const padding = (margin * frame.width) / IMAGE_SIZE.width
  return {
    x: frame.x - padding,
    y: frame.y - padding,
    width: frame.width + padding * 2,
    height: frame.height + padding * 2,
  }
}

export function promptStyle(document, viewport, layout) {
  const hasReferences = document.references.length > 0
  const workspaceWidth = viewport.width - layout.navWidth
  const width = Math.min(hasReferences ? 364 : 344, workspaceWidth - layout.gutter * 2)
  const height = hasReferences ? 200 : 48
  const region = selectedRegion(document)
  // Region prompts align with the tools and All Projects, below the canvas on mobile.
  if (region) return { left: layout.gutter, top: layout.panelTop, width }

  const target = workspaceBox(expansionBounds(document.expansion, document.imageFrame), layout)
  return {
    left: clamp(
      target.x + target.width / 2 - width / 2,
      12,
      workspaceWidth - width - 12,
    ),
    top: clamp(
      target.y + target.height + 7,
      88,
      Math.max(88, viewport.height - height - 190),
    ),
    width,
  }
}
