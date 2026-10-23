import test from 'node:test'
import assert from 'node:assert/strict'
import { CANVAS_PROPORTIONS, changeCanvasProportion, fitCanvasBounds, imageDimensionsPatch } from '../src/editor/model/canvas.js'
import { initialDocument, editResult } from '../src/editor/model/document.js'
import { createHistory, historyReducer } from '../src/editor/model/history.js'

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`)

test('canvas proportions contain wide and tall images without changing the source geometry', () => {
  for (const content of [
    { x: 343, y: 70, width: 832, height: 833 },
    { x: -20, y: 15, width: 1600, height: 900 },
    { x: 0, y: -100, width: 500, height: 1200 },
  ]) {
    for (const option of CANVAS_PROPORTIONS) {
      const canvas = fitCanvasBounds(content, option.id)
      assert.ok(canvas.width >= content.width)
      assert.ok(canvas.height >= content.height)
      near(canvas.x + canvas.width / 2, content.x + content.width / 2)
      near(canvas.y + canvas.height / 2, content.y + content.height / 2)
      if (option.id === 'original') assert.equal(canvas, content)
      else near(canvas.width / canvas.height, option.width / option.height)
    }
  }
})

test('canvas resizing is undoable without changing the image, region, prompt, or references', () => {
  const document = { ...initialDocument(), prompt: 'keep this', region: { x: 20, y: 30, width: 100, height: 200 }, references: [{ id: 'r', src: '/ref.png', weight: 30 }] }
  let history = createHistory(document)
  history = historyReducer(history, { type: 'update', patch: (current) => changeCanvasProportion(current, '16:9') })
  assert.deepEqual(history.present, { ...document, canvasProportion: '16:9' })
  const undone = historyReducer(history, { type: 'undo' })
  assert.deepEqual(undone.present, document)
  assert.deepEqual(historyReducer(undone, { type: 'redo' }).present, history.present)
  assert.equal(changeCanvasProportion(history.present, '16:9'), null)
  assert.equal(changeCanvasProportion(document, 'invalid'), null)
})

test('opening a variation preserves the chosen canvas proportion', () => {
  const document = { ...initialDocument(), canvasProportion: '2:3', results: [{ id: 'result', src: '/result.png' }] }
  const next = { ...document, ...editResult(document, 'result') }
  assert.equal(next.canvasProportion, '2:3')
})

test('loaded image dimensions preserve its natural aspect and ignore stale loads', () => {
  const document = initialDocument()
  const size = { width: 1600, height: 900 }
  const patch = imageDimensionsPatch(document, document.imageId, document.image, size)
  near(patch.imageFrame.width / patch.imageFrame.height, 16 / 9)
  assert.equal(patch.imageFrame.x, document.imageFrame.x)
  assert.equal(imageDimensionsPatch(document, 'old', document.image, size), null)
  assert.equal(imageDimensionsPatch(document, document.imageId, '/old.png', size), null)
  assert.equal(imageDimensionsPatch(document, document.imageId, document.image, { width: 0, height: 0 }), null)
  assert.equal(imageDimensionsPatch({ ...document, ...patch }, document.imageId, document.image, size), null)
})
