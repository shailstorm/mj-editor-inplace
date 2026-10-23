import test from 'node:test'
import assert from 'node:assert/strict'
import { moveRegion, resizeRegion } from '../src/editor/model/transforms.js'

const corners = ['nw', 'ne', 'sw', 'se']
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`)

test('rectangle regions move within the photo without changing their dimensions', () => {
  const frame = { x: 100, y: 200, width: 831.96, height: 600 }
  const region = { x: 100, y: 100, width: 200, height: 150 }
  assert.deepEqual(moveRegion(region, frame, { x: 30, y: -20 }), {
    x: 130,
    y: 80,
    width: 200,
    height: 150,
  })
  assert.deepEqual(moveRegion(region, frame, { x: -10000, y: -10000 }), { ...region, x: 0, y: 0 })
  assert.deepEqual(moveRegion(region, frame, { x: 10000, y: 10000 }), {
    ...region,
    x: 631.96,
    y: 450,
  })
  assert.equal(moveRegion(region, frame, { x: 0, y: 0 }), region)
})

test('rectangle corners resize freely, hold the opposite corner, and stay inside the photo', () => {
  const frame = { x: 100, y: 200, width: 831.96, height: 600 }
  const region = { x: 100, y: 100, width: 200, height: 150 }
  for (const corner of corners) {
    const west = corner.includes('w'),
      north = corner.includes('n')
    const resized = resizeRegion(region, frame, corner, { x: west ? -30 : 30, y: north ? -50 : 50 })
    near(resized.width, 230)
    near(resized.height, 200)
    near(resized.x + (west ? resized.width : 0), region.x + (west ? region.width : 0))
    near(resized.y + (north ? resized.height : 0), region.y + (north ? region.height : 0))
    for (const multiplier of [-1, 1]) {
      const clamped = resizeRegion(region, frame, corner, {
        x: multiplier * 10000,
        y: multiplier * 10000,
      })
      assert.ok(clamped.x >= 0 && clamped.y >= 0)
      assert.ok(clamped.x + clamped.width <= 831.96 && clamped.y + clamped.height <= 600)
      assert.ok(clamped.width >= 5 && clamped.height >= 5)
    }
  }
})

