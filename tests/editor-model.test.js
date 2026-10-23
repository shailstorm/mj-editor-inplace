import { outputDocument } from './fixtures/documents.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { initialDocument } from '../src/editor/model/document.js'
import { resultImages } from '../src/editor/model/assets.js'
import assets from '../src/figma-assets.json' with { type: 'json' }

test('new project state is independent and starts without any selection or prepared edits', () => {
  const first = outputDocument()
  first.results[0].src = '/changed.png'
  first.selected.push('result-0')
  const fresh = outputDocument()
  assert.equal(fresh.results[0].src, resultImages[0])
  assert.deepEqual(fresh.selected, ['source-original'])
  const selection = initialDocument()
  assert.equal(selection.prompt, '')
  assert.deepEqual(selection.results, [])
  assert.equal(selection.region, null)
  assert.deepEqual(selection.selected, [])
  assert.deepEqual(selection.references, [])
})

test('all registered assets exist locally, with valid image headers and SVG dimensions', () => {
  for (const screen of Object.values(assets)) {
    for (const path of Object.values(screen)) {
      assert.match(path, /^\/(figma|icons)\//)
      const file = new URL('../public' + path, import.meta.url)
      assert.ok(statSync(file).size > 0, path)
      if (path.endsWith('.png'))
        assert.equal(readFileSync(file).subarray(1, 4).toString(), 'PNG', path)
      if (path.endsWith('.svg')) {
        const root = readFileSync(file, 'utf8').match(/<svg[^>]*>/)?.[0]
        assert.ok(root, path)
        assert.match(root, /width="[\d.]+"/)
        assert.match(root, /height="[\d.]+"/)
      }
    }
  }
})

test('static toolbar and selection SVGs retain the Figma intrinsic geometry', () => {
  const cases = [
    ['selection-LucideHand.svg', 18, 18],
    ['selection-LucideSend.svg', 44, 24],
    ['selection-SelectedArea.svg', 232, 142],
    ['output-Rectangle1.svg', 558, 264],
  ]
  for (const [name, width, height] of cases) {
    const root = readFileSync(new URL('../public/figma/' + name, import.meta.url), 'utf8').match(
      /<svg[^>]*>/,
    )[0]
    assert.equal(Number(root.match(/width="([\d.]+)"/)[1]), width)
    assert.equal(Number(root.match(/height="([\d.]+)"/)[1]), height)
  }
})
