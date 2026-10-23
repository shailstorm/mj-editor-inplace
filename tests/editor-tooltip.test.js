import test from 'node:test'
import assert from 'node:assert/strict'
import { tooltipPosition } from '../src/editor/model/tooltip.js'

test('tooltips align above their heading when there is room', () => {
  assert.deepEqual(tooltipPosition(
    { left: 40, top: 200, bottom: 214 },
    { width: 230, height: 100 },
    { width: 800, height: 600 },
  ), { left: 40, top: 92, placement: 'top' })
})

test('tooltips flip below headings near the top edge and stay inside narrow screens', () => {
  assert.deepEqual(tooltipPosition(
    { left: 285, top: 20, bottom: 34 },
    { width: 230, height: 100 },
    { width: 320, height: 568 },
  ), { left: 82, top: 42, placement: 'bottom' })
})

test('tooltips clamp to the visible viewport, including keyboard and viewport offsets', () => {
  const viewport = { left: 40, top: 200, width: 320, height: 250 }
  const position = tooltipPosition(
    { left: 10, top: 405, bottom: 419 },
    { width: 230, height: 180 },
    viewport,
  )
  assert.equal(position.placement, 'top')
  assert.ok(position.left >= viewport.left + 8)
  assert.ok(position.left + 230 <= viewport.left + viewport.width - 8)
  assert.ok(position.top >= viewport.top + 8)
  assert.ok(position.top + 180 <= viewport.top + viewport.height - 8)
})
