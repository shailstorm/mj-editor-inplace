import test from 'node:test'
import assert from 'node:assert/strict'
import { animateVariationChanges } from '../src/editor/services/variation-motion.js'

function thumbnail(id, x, y) {
  const calls = []
  const element = { animate(frames, options) {
    const animation = { frames, options }
    calls.push(animation)
    return animation
  } }
  return { id, x, y, element, calls }
}

test('new batches slide existing thumbnails down and fade in the new thumbnails', () => {
  const first = thumbnail('new-1', 4, 4)
  const second = thumbnail('new-2', 4, 96)
  const old = thumbnail('old', 4, 188)
  const animations = animateVariationChanges([first, second, old], new Map([['old', { x: 4, y: 4 }]]))
  assert.equal(animations.length, 3)
  assert.equal(old.calls[0].frames[0].transform, 'translateY(-184px)')
  assert.equal(old.calls[0].frames[1].transform, 'translate(0, 0)')
  assert.equal(first.calls[0].frames[0].opacity, 0)
  assert.equal(first.calls[0].frames[1].opacity, 1)
  assert.ok(second.calls[0].options.delay > first.calls[0].options.delay)
})

test('mobile batches slide existing thumbnails horizontally', () => {
  const entering = thumbnail('new', 4, 4)
  const old = thumbnail('old', 96, 4)
  animateVariationChanges([entering, old], new Map([['old', { x: 4, y: 4 }]]), { horizontal: true })
  assert.equal(old.calls[0].frames[0].transform, 'translateX(-92px)')
  assert.equal(entering.calls[0].frames[0].transform, 'translateX(-8px)')
})

test('favorites, image selection and reduced-motion preferences do not replay list animations', () => {
  const old = thumbnail('old', 4, 4)
  const previous = new Map([['old', { x: 4, y: 4 }]])
  assert.deepEqual(animateVariationChanges([old], previous), [])
  const entering = thumbnail('new', 4, 4)
  assert.deepEqual(animateVariationChanges([entering, old], previous, { reducedMotion: true }), [])
  assert.equal(old.calls.length, 0)
  assert.equal(entering.calls.length, 0)
})
