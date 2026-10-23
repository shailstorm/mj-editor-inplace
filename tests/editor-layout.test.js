import test from 'node:test'
import assert from 'node:assert/strict'
import { REGION_PANEL_WIDTH } from '../src/editor/model/region-panel.js'
import { CANVAS_PROPORTIONS } from '../src/editor/model/canvas.js'
import { initialDocument } from '../src/editor/model/document.js'
import { documentPoint, imagePoint } from '../src/editor/model/geometry.js'
import { IMAGE_SIZE, NAV_WIDTH, imageLayout, workspaceBox, expansionBounds, promptStyle } from '../src/editor/model/layout.js'

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`)
const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 390, height: 844, safeAreaBottom: 34 },
  { width: 844, height: 390 },
  { width: 800, height: 600 },
  { width: 1366, height: 1024, coarsePointer: true },
  { width: 1100, height: 800 },
  { width: 1200, height: 800 },
  { width: 1201, height: 800 },
  { width: 1600, height: 1043 },
  { width: 2400, height: 1600 },
]

function contained(inner, outer) {
  assert.ok(inner.x >= outer.x - 1e-8)
  assert.ok(inner.y >= outer.y - 1e-8)
  assert.ok(inner.x + inner.width <= outer.x + outer.width + 1e-8)
  assert.ok(inner.y + inner.height <= outer.y + outer.height + 1e-8)
}

function canvasGroup(layout) {
  return {
    top: Math.min(layout.canvas.y, layout.proportions.y),
    bottom: Math.max(layout.canvas.y + layout.canvas.height, layout.proportions.y + 38),
  }
}

test('every canvas proportion fits the screen with the entire image and expansion visible', () => {
  for (const viewport of viewports) {
    for (const option of CANVAS_PROPORTIONS) {
      for (const expansion of [0, 80, 800]) {
        const document = { ...initialDocument(), expansion, canvasProportion: option.id }
        const layout = imageLayout(document, viewport)
        const content = workspaceBox(expansionBounds(expansion, document.imageFrame), layout)
        contained(content, layout.canvas)
        contained(layout.canvas, { x: layout.gutter, y: 0, width: viewport.width - layout.navWidth - layout.gutter * 2, height: viewport.height - layout.bottomNavHeight - 24 })
        const ratio = option.id === 'original' ? content.width / content.height : option.width / option.height
        near(layout.canvas.width / layout.canvas.height, ratio)
        near(content.x + content.width / 2, layout.canvas.x + layout.canvas.width / 2)
        near(content.y + content.height / 2, layout.canvas.y + layout.canvas.height / 2)
        near(layout.navWidth + layout.canvas.x + layout.canvas.width / 2, viewport.width / 2)
        near(layout.toolbar.y, viewport.height - layout.bottomDockHeight)
        near(layout.toolbar.x + layout.toolbar.width / 2, viewport.width / 2)
        near(layout.proportions.x, layout.canvas.x + layout.canvas.width)
        near(layout.proportions.y + 38 + 12, layout.canvas.y)
        const group = canvasGroup(layout)
        near(layout.canvas.y + layout.canvas.height / 2, (layout.stage.top + layout.stage.bottom) / 2)
        assert.ok(group.top >= layout.stage.top - 1e-8)
        assert.ok(group.bottom <= layout.stage.bottom + 1e-8)
        if (!layout.stacked) {
          near(layout.panelTop, 88)
          assert.ok(layout.canvas.x >= 24 + REGION_PANEL_WIDTH + 24 - 1e-8)
        } else {
          near(layout.panelTop, 24)
        }
        if (layout.navWidth === 0) {
          near(layout.bottomNavHeight, 52 + (viewport.safeAreaBottom ?? 0))
          near(layout.toolbar.width, Math.min(400, viewport.width - layout.gutter * 2))
        } else {
          assert.equal(layout.bottomNavHeight, 0)
        }
        contained({ ...layout.toolbar, height: 55.2 }, {
          x: 0, y: 0,
          width: viewport.width,
          height: viewport.height - layout.bottomNavHeight,
        })
      }
    }
  }
})

test('compact layout includes 1200px and frees canvas space at smaller desktop widths', () => {
  for (const width of [1100, 1200]) {
    const layout = imageLayout(initialDocument(), { width, height: 800 })
    assert.equal(layout.stacked, true)
    assert.ok(layout.canvas.width > 400)
  }
  assert.equal(imageLayout(initialDocument(), { width: 1201, height: 800 }).stacked, false)
})

test('desktop toolbar stays at the bottom while proportions sit above the centered canvas', () => {
  const viewport = { width: 1600, height: 1043 }
  const layout = imageLayout(initialDocument(), viewport)
  near(layout.toolbar.y + 55.2, viewport.height - 24)
  near(layout.stage.top, 24 + 55.2 + 16)
  near(layout.stage.bottom, layout.toolbar.y - 16)
  near(layout.canvas.y + layout.canvas.height / 2, (layout.stage.top + layout.stage.bottom) / 2)
  near(layout.proportions.x, layout.canvas.x + layout.canvas.width)
  near(layout.proportions.y + 38 + 12, layout.canvas.y)
  near(layout.panelTop, 88)
})

test('mobile variations reserve footer space while region selection preserves the layout', () => {
  for (const viewport of viewports) {
    const document = initialDocument()
    const layout = imageLayout(document, viewport)
    const withResults = { ...document, results: [{ id: 'new', src: '/new.png' }] }
    const resultsLayout = imageLayout(withResults, viewport)
    if (layout.navWidth === 0) {
      assert.equal(layout.bottomVariationsHeight, 0)
      assert.equal(resultsLayout.bottomVariationsHeight, 128)
      near(resultsLayout.bottomDockHeight, resultsLayout.bottomNavHeight + 128 + resultsLayout.bottomToolbarHeight)
      near(resultsLayout.toolbar.y, layout.toolbar.y - 128)
      near(resultsLayout.toolbar.x, layout.toolbar.x)
      near(resultsLayout.toolbar.width, layout.toolbar.width)
      assert.ok(resultsLayout.canvas.height <= layout.canvas.height)
    } else {
      assert.deepEqual(resultsLayout, layout)
    }
    assert.deepEqual(imageLayout({ ...withResults, results: [...withResults.results, { id: 'another', src: '/another.png' }] }, viewport), resultsLayout)
    assert.deepEqual(imageLayout({ ...withResults, selected: [document.imageId], region: { x: 10, y: 10, width: 20, height: 20 } }, viewport), resultsLayout)
  }
})

test('every mobile canvas proportion centers above the bottom toolbar, variations and navigation', () => {
  for (const viewport of viewports.filter((size) => size.width < 768)) {
    for (const { id } of CANVAS_PROPORTIONS) {
      const document = { ...initialDocument(), canvasProportion: id, results: [{ id: 'output', src: '/output.png' }] }
      const layout = imageLayout(document, viewport)
      contained(layout.canvas, {
        x: 0, y: 0, width: viewport.width,
        height: layout.stage.bottom,
      })
      near(layout.bottomDockHeight, 52 + (viewport.safeAreaBottom ?? 0) + 128 + 55.2 + 8)
      near(layout.toolbar.y + 55.2 + 8, viewport.height - layout.bottomNavHeight - 128)
      near(layout.stage.top, 24 + 78 + 16)
      near(layout.stage.bottom + 16, layout.toolbar.y)
      near(layout.navWidth + layout.canvas.x + layout.canvas.width / 2, viewport.width / 2)
      const group = canvasGroup(layout)
      near(layout.canvas.y + layout.canvas.height / 2, (layout.stage.top + layout.stage.bottom) / 2)
      assert.ok(group.bottom <= layout.stage.bottom + 1e-8)
      near(layout.proportions.y + 38 + 12, layout.canvas.y)
      assert.ok(layout.proportions.maxHeight > 0)
      if (layout.proportions.placement === 'bottom') {
        assert.ok(layout.proportions.y + 38 + 10 + layout.proportions.maxHeight <= layout.stage.bottom + 1e-8)
      } else {
        assert.ok(layout.proportions.y - 10 - layout.proportions.maxHeight >= layout.stage.top - 1e-8)
      }
    }
  }
})

test('pointer coordinates reverse fitting and letterboxing for every proportion', () => {
  for (const viewport of viewports) {
    for (const option of CANVAS_PROPORTIONS) {
      const document = { ...initialDocument(), canvasProportion: option.id }
      const layout = imageLayout(document, viewport)
      const rect = { left: layout.navWidth, top: -100 }
      const point = { x: 400, y: 700 }
      const client = {
        x: rect.left + layout.x + point.x * layout.scale,
        y: rect.top + layout.y + point.y * layout.scale,
      }
      const actual = documentPoint(client, rect, layout)
      near(actual.x, point.x)
      near(actual.y, point.y)
      assert.deepEqual(imagePoint({ x: document.imageFrame.x, y: document.imageFrame.y }, document.imageFrame, IMAGE_SIZE), { x: 0, y: 0 })
    }
  }
})

test('legacy whole-image prompts remain within the workspace and clear of the variation strip', () => {
  for (const viewport of viewports.filter((item) => item.height >= 568)) {
    for (const references of [[], ['/reference.png']]) {
      const document = { ...initialDocument(), selected: ['source-original'], references }
      const layout = imageLayout(document, viewport)
      const prompt = promptStyle(document, viewport, layout)
      assert.ok(prompt.left >= 12)
      assert.ok(prompt.left + prompt.width <= viewport.width - layout.navWidth - 12)
      assert.ok(prompt.top >= 88)
      assert.ok(prompt.top + (references.length ? 200 : 48) <= viewport.height - 190)
    }
  }
})

test('region prompts preserve desktop placement and use the header on small screens', () => {
  for (const viewport of viewports) {
    const document = { ...initialDocument(), selected: ['source-original'], region: { x: 10, y: 20, width: 100, height: 100 } }
    const layout = imageLayout(document, viewport)
    const prompt = promptStyle(document, viewport, layout)
    near(prompt.left, layout.gutter)
    near(prompt.top, layout.panelTop)
    if (!layout.stacked) near(prompt.left + NAV_WIDTH, 106)
  }
})
