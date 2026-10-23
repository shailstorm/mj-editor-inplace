import test from 'node:test'
import assert from 'node:assert/strict'
import { initialDocument } from '../src/editor/model/document.js'
import { imageLayout, canvasBounds } from '../src/editor/model/layout.js'
import { createHistory, historyReducer } from '../src/editor/model/history.js'
import { resizeImage, moveImage, resizeCrop, moveImageBehindCrop, cropImagePatch, visibleImageFrame, cropInsets } from '../src/editor/model/image-transforms.js'

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`)
const viewport = { width: 1600, height: 1043 }

function inside(frame, bounds) {
  assert.ok(frame.x >= bounds.x - 1e-8)
  assert.ok(frame.y >= bounds.y - 1e-8)
  assert.ok(frame.x + frame.width <= bounds.x + bounds.width + 1e-8)
  assert.ok(frame.y + frame.height <= bounds.y + bounds.height + 1e-8)
}

test('all photo corners preserve aspect ratio and opposite anchors without resizing the canvas', () => {
  const document = initialDocument()
  const bounds = canvasBounds(document)
  for (const corner of ['nw', 'ne', 'sw', 'se']) {
    const west = corner.includes('w'), north = corner.includes('n')
    const patch = resizeImage(document, bounds, corner, { x: west ? 200 : -200, y: north ? 100 : -100 })
    const frame = patch.imageFrame
    inside(frame, bounds)
    assert.ok(frame.width < document.imageFrame.width)
    near(frame.width / frame.height, document.imageFrame.width / document.imageFrame.height)
    near(frame.x + (west ? frame.width : 0), document.imageFrame.x + (west ? document.imageFrame.width : 0))
    near(frame.y + (north ? frame.height : 0), document.imageFrame.y + (north ? document.imageFrame.height : 0))
    assert.deepEqual(imageLayout({ ...document, ...patch }, viewport), imageLayout(document, viewport))
    const larger = resizeImage({ ...document, ...patch }, bounds, corner, { x: west ? -10000 : 10000, y: north ? -10000 : 10000 })
    inside(larger.imageFrame, bounds)
  }
})

test('resized photos can move within the canvas and can be restored with Undo', () => {
  const document = initialDocument()
  const bounds = canvasBounds(document)
  const resize = resizeImage(document, bounds, 'se', { x: -300, y: -300 })
  let history = historyReducer(createHistory(document), { type: 'update', patch: resize })
  const move = moveImage(history.present, bounds, { x: 10000, y: 10000 })
  inside(move.imageFrame, bounds)
  history = historyReducer(history, { type: 'update', patch: move })
  history = historyReducer(history, { type: 'undo' })
  assert.deepEqual(history.present.imageFrame, resize.imageFrame)
  assert.deepEqual(historyReducer(history, { type: 'undo' }).present, document)
})

test('crop handles stay in the source and can later reveal pixels outside the current crop', () => {
  const source = { x: 100, y: 100, width: 800, height: 600 }
  const crop = resizeCrop(source, source, 'se', { x: -300, y: -200 })
  assert.deepEqual(crop, { ...source, width: 500, height: 400 })
  const expanded = resizeCrop(crop, source, 'se', { x: 10000, y: 10000 })
  assert.deepEqual(expanded, source)
  for (const handle of ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se']) {
    const next = resizeCrop(crop, source, handle, { x: -10000, y: -10000 })
    inside(next, source)
    assert.ok(next.width >= 24 && next.height >= 24)
  }
})

test('dragging the source behind a fixed crop never exposes an empty crop area', () => {
  const source = { x: 100, y: 100, width: 800, height: 600 }
  const crop = { x: 300, y: 250, width: 400, height: 300 }
  for (const direction of [-1, 1]) {
    const moved = moveImageBehindCrop(source, crop, { x: direction * 10000, y: direction * 10000 })
    inside(crop, moved)
    assert.equal(moved.width, source.width)
    assert.equal(moved.height, source.height)
  }
})

test('applying and resizing a crop keep original pixels available and are undoable', () => {
  const document = { ...initialDocument(), prompt: 'keep this', references: [{ id: 'r', weight: 30 }] }
  const draft = { sourceFrame: document.imageFrame, box: { x: 443, y: 170, width: 400, height: 400 } }
  const patch = cropImagePatch(document, draft)
  let history = historyReducer(createHistory(document), { type: 'update', patch })
  assert.equal(history.present.image, document.image)
  assert.deepEqual(history.present.imageFrame, document.imageFrame)
  assert.deepEqual(visibleImageFrame(history.present), draft.box)
  assert.equal(history.present.prompt, document.prompt)
  assert.deepEqual(history.present.references, document.references)
  assert.equal(cropImagePatch(history.present, draft), null)
  const resize = resizeImage(history.present, canvasBounds(document), 'se', { x: -100, y: -100 })
  assert.ok(resize.imageFrame.width < document.imageFrame.width)
  assert.ok(resize.imageCrop.width < draft.box.width)
  assert.equal(cropInsets(resize.imageFrame, resize.imageCrop), cropInsets(document.imageFrame, draft.box))
  history = historyReducer(history, { type: 'undo' })
  assert.deepEqual(history.present, document)
  assert.deepEqual(historyReducer(history, { type: 'redo' }).present.imageCrop, draft.box)
})
