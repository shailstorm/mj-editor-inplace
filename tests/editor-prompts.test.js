import test from 'node:test'
import assert from 'node:assert/strict'
import { initialDocument, appendResults } from '../src/editor/model/document.js'
import { initialAura, promptType, changeAura, canGeneratePrompt, promptRequest } from '../src/editor/model/prompts.js'
import { selectImage } from '../src/editor/model/selection.js'

test('image prompts are the default, including when the whole photo is selected', () => {
  const document = initialDocument()
  assert.equal(promptType(document), 'image')
  assert.equal(promptType({ ...document, ...selectImage(document, document.imageId) }), 'image')
  assert.equal(promptType({ ...document, selected: [document.imageId], region: { x: 10, y: 20, width: 50, height: 60 } }), 'region')
})

test('image generation targets the photo without requiring a selection and includes Aura', () => {
  const document = { ...initialDocument(), prompt: 'warm afternoon light', aura: { left: 'dreamy', right: 'realist', balance: 70 } }
  const request = promptRequest(document)
  assert.equal(request.promptType, 'image')
  assert.deepEqual(request.targetImages.map((image) => image.id), [document.imageId])
  assert.equal(request.region, null)
  assert.deepEqual(request.aura, document.aura)
  const next = { ...document, ...appendResults(document, [{ src: '/output.png' }], 'image') }
  assert.deepEqual(next.promptOutputIds, ['image-0'])
  assert.deepEqual(next.aura, document.aura)
})

test('region generation excludes Aura and switching back preserves the shared draft', () => {
  const document = {
    ...initialDocument(), prompt: 'replace the shoes',
    references: [{ id: 'ref', src: '/reference.png', weight: 65 }],
    aura: { left: 'soft', right: 'sharp', balance: 25 },
    selected: ['source-original'], region: { x: 10, y: 20, width: 50, height: 60 },
  }
  const request = promptRequest(document)
  assert.equal(request.promptType, 'region')
  assert.deepEqual(request.region, document.region)
  assert.equal(request.aura, undefined)
  const next = { ...document, ...selectImage(document, document.imageId) }
  assert.equal(promptType(next), 'image')
  assert.equal(next.prompt, document.prompt)
  assert.deepEqual(next.references, document.references)
  assert.deepEqual(next.aura, document.aura)
})

test('generation is disabled for missing images, unfinished selections, blank prompts and suggestions', () => {
  for (const prompt of ['', ' \n\t ', '/']) {
    assert.equal(canGeneratePrompt({ ...initialDocument(), prompt }), false)
    assert.equal(promptRequest({ ...initialDocument(), prompt }), null)
  }
  const document = { ...initialDocument(), prompt: 'new colors' }
  assert.equal(canGeneratePrompt(document), true)
  assert.equal(canGeneratePrompt(document, { busy: true }), false)
  assert.equal(canGeneratePrompt(document, { selecting: true }), false)
  assert.equal(promptRequest({ ...document, image: null }), null)
})

test('Aura starts centered, keeps its words when adjusting the balance, and clamps its range', () => {
  const aura = initialAura()
  const words = changeAura(aura, { left: 'impressionist', right: 'realist' })
  assert.equal(words.balance, 50)
  assert.equal(changeAura(words, { balance: -20 }).balance, 0)
  assert.equal(changeAura(words, { balance: 120 }).balance, 100)
  assert.equal(changeAura(words, { balance: 'invalid' }).balance, 50)
  assert.deepEqual(changeAura(words, { balance: '65' }), { ...words, balance: 65 })
  assert.deepEqual(aura, initialAura())
})

test('Aura cannot lean toward an empty word and returns to center when that word is cleared', () => {
  const leftOnly = { ...initialAura(), left: 'dreamcore' }
  assert.equal(changeAura(leftOnly, { balance: 0 }).balance, 0)
  assert.equal(changeAura(leftOnly, { balance: 100 }).balance, 50)
  const rightOnly = { ...initialAura(), right: 'brutalist' }
  assert.equal(changeAura(rightOnly, { balance: 100 }).balance, 100)
  assert.equal(changeAura(rightOnly, { balance: 0 }).balance, 50)
  assert.equal(changeAura(initialAura(), { balance: 100 }).balance, 50)

  const leaning = { left: 'dreamcore', right: 'brutalist', balance: 80 }
  assert.equal(changeAura(leaning, { right: '' }).balance, 50)
  assert.equal(changeAura(leaning, { right: ' \t ' }).balance, 50)
  assert.equal(changeAura(leaning, { left: '' }).balance, 80)
  assert.equal(changeAura({ ...leftOnly, balance: 10 }, { left: '' }).balance, 50)
})
