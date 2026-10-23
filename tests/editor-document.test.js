import { outputDocument } from './fixtures/documents.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { initialDocument, appendResults, editResult, deleteSelection, favoriteResults, toggleResultFavorite } from '../src/editor/model/document.js'
import { historyReducer, createHistory } from '../src/editor/model/history.js'
import { selectImage, selectedImages } from '../src/editor/model/selection.js'
import { imageDimensionsPatch } from '../src/editor/model/canvas.js'
import { regionBounds } from '../src/editor/model/layout.js'
import { visibleImageFrame } from '../src/editor/model/image-transforms.js'

test('adding variations preserves the active image and previous batches without canvas positions', () => {
  const before = initialDocument()
  const first = { ...before, ...appendResults(before, [{ src: '/a.png' }, { src: '/b.png' }], 'first') }
  const second = { ...first, ...appendResults(first, [{ src: '/c.png' }], 'second') }
  assert.deepEqual(second.imageFrame, before.imageFrame)
  assert.equal(second.image, before.image)
  assert.equal(second.prompt, before.prompt)
  assert.deepEqual(second.references, before.references)
  assert.equal(second.results.length, 3)
  assert.deepEqual(second.results.slice(0, 2), first.results)
  assert.deepEqual(second.results[2], { id: 'second-0', src: '/c.png' })
  assert.deepEqual(second.selected, [before.imageId])
  assert.equal(second.region, null)
  assert.equal(new Set(second.results.map((result) => result.id)).size, 3)
})

test('favoriting only the requested outputs preserves the edit and survives switching images and generation', () => {
  const before = { ...outputDocument(), prompt: 'keep this', region: { x: 10, y: 20, width: 30, height: 40 } }
  const ids = [before.results[0].id, before.results[2].id]
  const patch = favoriteResults(before, [...ids, ids[0], 'unknown'])
  const after = { ...before, ...patch }
  assert.deepEqual(Object.keys(patch), ['results'])
  assert.deepEqual(after.results.filter((result) => result.favorite).map((result) => result.id), ids)
  assert.equal(after.results[1], before.results[1])
  assert.equal(before.results[0].favorite, undefined)
  assert.equal(favoriteResults(after, ids), null)
  assert.equal(favoriteResults(after, []), null)
  assert.equal(favoriteResults(after, ['unknown']), null)
  const switched = { ...after, ...editResult(after, ids[0]) }
  const next = { ...switched, ...appendResults(switched, [{ src: '/next.png' }], 'next') }
  assert.deepEqual(next.results.filter((result) => result.favorite).map((result) => result.id), ids)
  assert.equal(next.results.at(-1).favorite, undefined)
  const history = historyReducer(createHistory(before), { type: 'update', patch })
  assert.deepEqual(historyReducer(history, { type: 'undo' }).present, before)
  assert.deepEqual(historyReducer(historyReducer(history, { type: 'undo' }), { type: 'redo' }).present, after)
})

test('removing a favorite is undoable and unknown IDs do not change the document', () => {
  const before = outputDocument()
  const id = before.results[0].id
  const marked = { ...before, ...favoriteResults(before, [id]) }
  const history = historyReducer(createHistory(marked), { type: 'update', patch: (current) => toggleResultFavorite(current, id) })
  assert.equal(history.present.results[0].favorite, false)
  assert.deepEqual(history.present.results.slice(1), marked.results.slice(1))
  assert.deepEqual(historyReducer(history, { type: 'undo' }).present, marked)
  assert.equal(toggleResultFavorite(before, 'unknown'), null)
})

test('editing a variation replaces the active image in place and keeps the previous image available', () => {
  const document = outputDocument()
  const result = document.results[2]
  const next = { ...document, ...editResult(document, result.id) }
  assert.equal(next.imageId, result.id)
  assert.equal(next.image, result.src)
  assert.deepEqual(next.imageFrame, document.imageFrame)
  assert.deepEqual(next.results[0], { id: document.imageId, src: document.image })
  assert.deepEqual(next.results.slice(1), document.results)
  assert.equal(next.results.length, document.results.length + 1)
  assert.deepEqual(next.selected, [result.id])
  assert.equal(next.region, null)
  assert.equal(next.expansion, 0)
  assert.deepEqual(next.references, [])
  const restored = { ...next, ...editResult(next, document.imageId) }
  assert.equal(restored.image, document.image)
  assert.deepEqual(restored.imageFrame, document.imageFrame)
  assert.deepEqual(restored.results, next.results)
  assert.equal(editResult(restored, restored.imageId), null)
})

test('switching between before and every output preserves the draft, region, geometry, and output order', () => {
  for (const outline of [undefined, { path: 'M100 100L200 100L180 200Z', width: 831.96, height: 833 }]) {
    const source = {
      ...initialDocument(),
      selected: ['source-original'],
      region: { x: 100, y: 100, width: 100, height: 100, ...(outline && { outline }) },
      imageCrop: { x: 350, y: 80, width: 500, height: 450 },
      prompt: 'change just this region',
      references: [{ id: 'ref', src: '/ref.png', weight: 80 }],
      aura: { left: 'dreamcore', right: 'brutalist', balance: 25 },
      expansion: 30,
      canvasProportion: '3:2',
    }
    const generated = { ...source, ...appendResults(source, [{ src: '/a.png' }, { src: '/b.png' }], 'batch', { forRegion: true }) }
    let next = generated
    for (const id of ['batch-0', 'batch-1', source.imageId, 'batch-0', source.imageId]) {
      next = { ...next, ...editResult(next, id) }
      assert.deepEqual(next.selected, [id])
      for (const field of ['prompt', 'references', 'aura', 'region', 'imageFrame', 'imageCrop', 'canvasFrame', 'expansion', 'canvasProportion', 'promptOutputIds']) {
        assert.deepEqual(next[field], generated[field], `${field} should survive switching to ${id}`)
      }
      assert.deepEqual(next.results.slice(1), generated.results)
      assert.equal(next.results.length, 3)
      assert.deepEqual(regionBounds(next.region, visibleImageFrame(next)), regionBounds(source.region, visibleImageFrame(source)))
      assert.equal(imageDimensionsPatch(next, id, next.image, { width: 1600, height: 900 }), null)
    }
    const history = historyReducer(createHistory(generated), { type: 'update', patch: (current) => editResult(current, 'batch-0') })
    assert.deepEqual(historyReducer(history, { type: 'undo' }).present, generated)
    assert.deepEqual(historyReducer(historyReducer(history, { type: 'undo' }), { type: 'redo' }).present, history.present)
  }
})

test('only the active image can be selected, including with Shift-click', () => {
  const document = outputDocument()
  assert.deepEqual(selectImage(document, document.imageId, true).selected, [document.imageId])
  assert.deepEqual(selectImage(document, document.results[0].id).selected, [])
  assert.deepEqual(selectImage(document).selected, [])
  assert.deepEqual(selectedImages({ ...document, selected: [document.results[0].id] }), [])
})

test('deleting the active image preserves variations, supports undo, and allows choosing another image', () => {
  const document = outputDocument()
  const state = historyReducer(createHistory(document), { type: 'update', patch: deleteSelection })
  assert.equal(state.present.image, null)
  assert.deepEqual(state.present.results, document.results)
  assert.deepEqual(state.present.selected, [])
  assert.deepEqual(historyReducer(state, { type: 'undo' }).present, document)
  const next = { ...state.present, ...editResult(state.present, document.results[0].id) }
  assert.equal(next.image, document.results[0].src)
  assert.equal(next.results.length, document.results.length)
  assert.ok(next.results.every((result) => result.src))
  const removed = { ...next, ...deleteSelection(next) }
  const reopened = { ...removed, ...editResult(removed, next.imageId) }
  assert.equal(reopened.image, next.image)
  assert.deepEqual(reopened.results, next.results)
})
