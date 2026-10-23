import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { createElement, Children, isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { build } from 'vite'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readFileSync, statSync } from 'node:fs'
import { resultImages } from '../src/editor/model/assets.js'
import { initialDocument, appendResults, editResult } from '../src/editor/model/document.js'
import { createReference, setReferenceWeight } from '../src/editor/model/references.js'
import { changeAura } from '../src/editor/model/prompts.js'
import { regionPanelAssets, regionSampleImages } from '../src/editor/model/region-panel.js'
import { chatboxAssets } from '../src/editor/model/chatbox.js'

let PromptPanel, PromptOutputs, ReferenceWeight, ReferencePhoto, PanelSlider, AuraSection
before(async () => {
  const outDir = 'node_modules/.cache/region-panel-tests'
  await build({ logLevel: 'silent', build: {
    ssr: resolve('tests/fixtures/region-panel-components.jsx'), outDir, emptyOutDir: true,
  } })
  ;({ PromptPanel, PromptOutputs, ReferenceWeight, ReferencePhoto, PanelSlider, AuraSection } = await import(pathToFileURL(resolve(outDir, 'region-panel-components.js'))))
})

function regionDocument() {
  return { ...initialDocument(), selected: ['source-original'], region: { x: 100, y: 100, width: 100, height: 100 } }
}

function props(document, overrides = {}) {
  return { document, inputRef: { current: null }, actions: {}, ...overrides }
}

function find(element, predicate) {
  if (!isValidElement(element)) return null
  if (predicate(element)) return element
  for (const child of Children.toArray(element.props.children)) {
    const match = find(child, predicate)
    if (match) return match
  }
  return null
}

test('a selected region opens an empty prompt with reference upload and no weight slider', () => {
  const html = renderToStaticMarkup(createElement(PromptPanel, props(regionDocument())))
  assert.match(html, /Region Prompt/)
  assert.match(html, /Type &#x27;\/&#x27; for suggestions/)
  assert.match(html, /Upload reference/)
  assert.doesNotMatch(html, /type="range"|>Weight</)
  assert.match(html, /disabled="">Generate</)
  assert.doesNotMatch(html, /Save to snapshots/)
  assert.doesNotMatch(html, /aria-label="Aura"/)
})

test('compact prompt disclosures expand and collapse the mounted options for both prompt variants', () => {
  for (const document of [initialDocument(), regionDocument()]) {
    let expanded = false
    for (const expected of [false, true, false]) {
      const panel = PromptPanel(props(document, {
        compact: true, expanded, detailsId: 'prompt-options',
        onToggle() { expanded = !expanded },
      }))
      const inputSection = find(panel, (node) => Boolean(node.props.disclosure))
      const toggle = inputSection.props.disclosure
      const details = find(panel, (node) => node.props.id === 'prompt-options')
      assert.equal(toggle.props['aria-expanded'], expected)
      assert.equal(toggle.props['aria-controls'], 'prompt-options')
      assert.equal(toggle.props.type, 'button')
      assert.equal(details.props['aria-hidden'], !expected)
      assert.equal(details.props.inert, !expected)
      assert.equal(details.props['data-expanded'], expected)
      const html = renderToStaticMarkup(panel)
      assert.match(html, /Prompt references/)
      assert.match(html, document.region ? /Region Prompt/ : /Image Prompt/)
      if (document.region) assert.doesNotMatch(html, /aria-label="Aura"/)
      else assert.match(html, /aria-label="Aura"/)
      const icon = renderToStaticMarkup(toggle)
      assert.equal((icon.match(/<path /g) ?? []).length, 2)
      toggle.props.onClick()
    }
  }
})

test('compact dividers span the panel without SVG images while desktop dividers retain their assets', () => {
  const compact = renderToStaticMarkup(createElement(PromptPanel, props(initialDocument(), { compact: true, expanded: true })))
  assert.equal((compact.match(/class="prompt-panel-divider prompt-panel-divider-fluid"/g) ?? []).length, 3)
  assert.ok(!compact.includes(regionPanelAssets.divider))
  const desktop = renderToStaticMarkup(createElement(PromptPanel, props(initialDocument())))
  assert.ok(desktop.includes(regionPanelAssets.divider))
  assert.doesNotMatch(desktop, /prompt-panel-divider-fluid/)
})

test('collapsing and switching presentations preserves draft, Aura, references and each photo weight', () => {
  const document = {
    ...initialDocument(), prompt: 'pink combat boots',
    references: [createReference('/one.png'), { ...createReference('/two.png'), weight: 75 }],
    aura: { left: 'dreamcore', right: 'brutalist', balance: 25 },
  }
  for (const [compact, expanded] of [[true, true], [true, false], [false, false], [true, true]]) {
    const html = renderToStaticMarkup(createElement(PromptPanel, props(document, { compact, expanded })))
    assert.match(html, /value="pink combat boots"/)
    assert.match(html, /value="dreamcore"/)
    assert.match(html, /aria-label="Reference 1 weight"[^>]+value="30"/)
    assert.match(html, /aria-label="Reference 2 weight"[^>]+value="75"/)
    assert.match(html, /Remove reference 2/)
    assert.ok(html.indexOf('>References<') < html.indexOf('>Aura<'))
  }
})

test('compact panels keep generation guards and the reference upload action works', () => {
  for (const [prompt, busy, selecting] of [['', false, false], [' \t ', false, false], ['edit', true, false], ['edit', false, true], ['edit', false, false]]) {
    let generated = 0
    let attached = 0
    const panel = PromptPanel(props({ ...initialDocument(), prompt }, {
      compact: true, expanded: true, busy, isSelectingRegion: selecting,
      openReferencePicker() { attached++ }, actions: { generate() { generated++ } },
    }))
    const generate = find(panel, (node) => node.props.className === 'prompt-panel-primary')
    assert.equal(generate.props.disabled, !prompt.trim() || busy || selecting)
    const references = find(panel, (node) => Boolean(node.props.onUpload))
    references.props.onUpload()
    assert.equal(attached, 1)
    panel.props.onSubmit({ preventDefault() {} })
    assert.equal(generated, generate.props.disabled ? 0 : 1)
  }
})

test('chatbox assets are local and retain the design intrinsic dimensions', () => {
  for (const [key, width, height] of [['attach', 24, 24], ['send', 44, 24], ['plus', 23.5864, 23.5864], ['info', 14.7386, 15.8724]]) {
    const path = new URL('../public' + chatboxAssets[key], import.meta.url)
    assert.ok(statSync(path).size > 0)
    const root = readFileSync(path, 'utf8').match(/<svg[^>]*>/)[0]
    assert.equal(Number(root.match(/width="([\d.]+)"/)[1]), width)
    assert.equal(Number(root.match(/height="([\d.]+)"/)[1]), height)
  }
})

test('the image variant has editable Aura words and a centered accessible slider below References', () => {
  const html = renderToStaticMarkup(createElement(PromptPanel, props(initialDocument())))
  assert.match(html, /Image Prompt/)
  assert.match(html, /placeholder="dreamcore"/)
  assert.match(html, /placeholder="brutalist"/)
  assert.match(html, /aria-label="Aura balance"[^>]+value="50"/)
  assert.ok(html.indexOf('>References<') < html.indexOf('>Aura<'))

  const changes = []
  let aura = initialDocument().aura
  const onChange = (patch) => {
    changes.push(patch)
    aura = changeAura(aura, patch)
  }
  const section = AuraSection({ aura, onChange })
  const emptyRange = find(section, (node) => node.type === PanelSlider)
  assert.equal(emptyRange.props.disabled, true)
  find(PanelSlider(emptyRange.props), (node) => node.type === 'input').props.onChange({ target: { value: '75' } })
  assert.deepEqual(changes, [])
  find(section, (node) => node.props['aria-label'] === 'Left aura word').props.onChange({ target: { value: 'soft' } })
  find(section, (node) => node.props['aria-label'] === 'Right aura word').props.onChange({ target: { value: 'sharp' } })
  const range = find(AuraSection({ aura, onChange }), (node) => node.type === PanelSlider)
  assert.equal(range.props.centered, true)
  assert.equal(range.props.disabled, false)
  assert.equal(range.props.valueText, 'Neutral')
  find(PanelSlider(range.props), (node) => node.type === 'input').props.onChange({ target: { value: '75' } })
  assert.deepEqual(changes, [{ left: 'soft' }, { right: 'sharp' }, { balance: 75 }])
})

test('Aura only exposes the native slider range for populated words', () => {
  for (const [left, right, min, max, disabled] of [
    ['', '', 50, 50, true],
    ['soft', '', 0, 50, false],
    ['', 'sharp', 50, 100, false],
    ['soft', 'sharp', 0, 100, false],
    [' \t ', ' \n ', 50, 50, true],
  ]) {
    const section = AuraSection({ aura: { left, right, balance: disabled ? 80 : 50 } })
    const control = find(section, (node) => node.type === PanelSlider)
    const input = find(PanelSlider(control.props), (node) => node.type === 'input')
    assert.equal(input.props.min, min)
    assert.equal(input.props.max, max)
    assert.equal(input.props.disabled, disabled)
    assert.equal(input.props.value, 50)
  }
})

test('Aura describes its direction relative to the neutral center', () => {
  for (const [balance, valueText] of [[0, '100% toward soft'], [25, '50% toward soft'], [50, 'Neutral'], [75, '50% toward sharp'], [100, '100% toward sharp']]) {
    const section = AuraSection({ aura: { left: 'soft', right: 'sharp', balance } })
    const slider = find(section, (node) => node.type === PanelSlider)
    assert.equal(slider.props.valueText, valueText)
  }
})

test('output favorite action targets the displayed batch', () => {
  const results = [{ id: 'batch-0', src: '/a.png' }, { id: 'batch-1', src: '/b.png' }]
  let output
  let favorites
  function Capture() {
    output = PromptOutputs({ type: 'image', results, onFavorite(ids) { favorites = ids } })
    return output
  }
  const html = renderToStaticMarkup(createElement(Capture))
  assert.match(html, /Favorite 2 images/)
  assert.doesNotMatch(html, /Save to snapshots/)
  find(output, (node) => node.props.className === 'prompt-panel-primary').props.onClick()
  assert.deepEqual(favorites, ['batch-0', 'batch-1'])
})

test('image generation displays the same output section as region generation', () => {
  const before = { ...initialDocument(), prompt: 'new light' }
  const after = { ...before, ...appendResults(before, resultImages.map((src) => ({ src })), 'image') }
  const html = renderToStaticMarkup(createElement(PromptPanel, props(after)))
  assert.match(html, /Image output/)
  assert.match(html, /aria-label="Aura"/)
  assert.equal((html.match(/aria-label="Edit output /g) ?? []).length, 4)
})

test('opening outputs keeps both prompt variants populated with all four outputs', () => {
  for (const source of [initialDocument(), regionDocument()]) {
    const before = {
      ...source, prompt: 'keep my edit', references: [createReference('/keep-reference.png')],
      aura: { left: 'soft', right: 'sharp', balance: 25 },
    }
    let document = {
      ...before,
      ...appendResults(before, resultImages.map((src) => ({ src })), 'batch', { forRegion: Boolean(source.region) }),
    }
    for (const id of ['batch-0', 'batch-1', before.imageId]) {
      document = { ...document, ...editResult(document, id) }
      const html = renderToStaticMarkup(createElement(PromptPanel, props(document)))
      assert.match(html, /value="keep my edit"/)
      assert.match(html, /src="\/keep-reference.png"/)
      assert.equal((html.match(/aria-label="Edit output /g) ?? []).length, 4)
      assert.doesNotMatch(html, />Generate</)
      assert.match(html, source.region ? /aria-label="Region prompt panel"/ : /aria-label="Image prompt panel"/)
      if (!source.region) {
        assert.match(html, /value="soft"/)
        assert.match(html, /value="sharp"/)
      }
    }
  }
})

test('each uploaded reference contains its own weight control and removal button', () => {
  const document = { ...regionDocument(), references: [createReference('/one.png'), { ...createReference('/two.png'), weight: 75 }] }
  const html = renderToStaticMarkup(createElement(PromptPanel, props(document)))
  assert.equal((html.match(/type="range"/g) ?? []).length, 2)
  assert.match(html, /aria-label="Reference 1 weight"[^>]+value="30"/)
  assert.match(html, /aria-label="Reference 2 weight"[^>]+value="75"/)
  assert.match(html, /Remove reference 1/)
  assert.match(html, /Remove reference 2/)
  assert.doesNotMatch(html, />Weight<|Adjust reference|aria-pressed/)
  assert.equal(ReferenceWeight({ reference: undefined }), null)
})

test('photo controls adjust only their own reference and remove the correct photo', () => {
  const references = [createReference('/one.png'), createReference('/two.png')]
  let next = references
  let removed
  const photo = ReferencePhoto({
    reference: references[1], index: 1,
    onRemove: (index) => { removed = index },
    onWeightChange: (id, weight) => { next = setReferenceWeight(next, id, weight) },
  })
  const weight = find(photo, (node) => node.type === ReferenceWeight)
  const slider = find(ReferenceWeight(weight.props), (node) => node.type === PanelSlider)
  find(PanelSlider(slider.props), (node) => node.type === 'input').props.onChange({ target: { value: '80' } })
  assert.equal(next[0].weight, 30)
  assert.equal(next[1].weight, 80)
  assert.equal(slider.props.label, 'Reference 2 weight')
  find(photo, (node) => node.props['aria-label'] === 'Remove reference 2').props.onClick()
  assert.equal(removed, 1)
})

test('Generate ignores form submission for empty, whitespace-only, and busy prompts', () => {
  for (const [prompt, busy] of [['', false], [' \n\t ', false], ['edit the image', true], ['edit the image', false]]) {
    let generated = 0
    const panel = PromptPanel(props({ ...regionDocument(), prompt }, {
      busy, actions: { generate() { generated++ } },
    }))
    const button = find(panel, (node) => node.type === 'button')
    const disabled = !prompt.trim() || busy
    assert.equal(button.props.disabled, disabled)
    panel.props.onSubmit({ preventDefault() {} })
    assert.equal(generated, disabled ? 0 : 1)
  }
})

test('the image panel replaces the region variant without losing the draft', () => {
  const document = {
    ...regionDocument(),
    prompt: 'keep this edit',
    references: [createReference('/reference.png')],
    selected: [],
    region: null,
  }
  let generated = false
  const panel = PromptPanel(props(document, {
    actions: { generate() { generated = true } },
  }))
  const html = renderToStaticMarkup(panel)
  assert.match(html, /aria-label="Image prompt panel"/)
  assert.match(html, /aria-label="Aura"/)
  assert.match(html, /value="keep this edit"/)
  assert.match(html, /src="\/reference.png"/)
  assert.doesNotMatch(html, /disabled="">Generate</)
  panel.props.onSubmit({ preventDefault() {} })
  assert.equal(generated, true)
})

test('the panel stays visible and cannot generate while a new region is being drawn', () => {
  const document = { ...regionDocument(), prompt: 'keep this edit' }
  let generated = false
  const panel = PromptPanel(props(document, {
    isSelectingRegion: true,
    actions: { generate() { generated = true } },
  }))
  assert.match(renderToStaticMarkup(panel), /disabled="">Generate</)
  panel.props.onSubmit({ preventDefault() {} })
  assert.equal(generated, false)
})

test('weights belong to references and changing one does not affect another', () => {
  const references = [createReference('/one.png'), createReference('/two.png')]
  const next = setReferenceWeight(references, references[0].id, 75)
  assert.equal(next[0].weight, 75)
  assert.equal(next[1].weight, 30)
  assert.equal(references[0].weight, 30)
  assert.equal(setReferenceWeight(next, references[0].id, -10)[0].weight, 0)
  assert.equal(setReferenceWeight(next, references[0].id, 150)[0].weight, 100)
})

test('weight slider forwards its reference ID and supports native keyboard range controls', () => {
  const reference = createReference('/one.png')
  let change
  const control = ReferenceWeight({ reference, onChange(id, value) { change = { id, value } } })
  const sharedSlider = find(control, (node) => node.type === PanelSlider)
  const slider = find(PanelSlider(sharedSlider.props), (node) => node.type === 'input')
  assert.equal(slider.props.type, 'range')
  slider.props.onChange({ target: { value: '65' } })
  assert.deepEqual(change, { id: reference.id, value: 65 })
})

test('generation preserves the selected region and replaces Generate with the output panel', () => {
  const before = { ...regionDocument(), prompt: 'bunny ears' }
  const after = { ...before, ...appendResults(before, resultImages.map((src) => ({ src })), 'batch', { forRegion: true }) }
  assert.deepEqual(after.region, before.region)
  assert.equal(after.promptOutputIds.length, 4)
  const html = renderToStaticMarkup(createElement(PromptPanel, props(after)))
  assert.match(html, /Region output/)
  assert.match(html, />Select</)
  assert.match(html, /Favorite 4 images/)
  assert.equal((html.match(/aria-label="Edit output /g) ?? []).length, 4)
  assert.doesNotMatch(html, />Generate</)
})

test('region generation only displays its own batch, keeping earlier results available', () => {
  const before = { ...regionDocument(), results: [{ id: 'old', src: '/old.png' }] }
  const after = { ...before, ...appendResults(before, [{ src: '/new.png' }], 'batch', { forRegion: true }) }
  const html = renderToStaticMarkup(createElement(PromptPanel, props(after)))
  assert.equal(after.results.length, 2)
  assert.match(html, /\/new.png/)
  assert.doesNotMatch(html, /\/old.png/)
})

test('the Figma SVG assets retain their original dimensions and all panel assets are local', () => {
  for (const src of [...Object.values(regionPanelAssets), ...regionSampleImages]) {
    assert.ok(statSync(resolve('public' + src)).size > 0)
  }
  const dimensions = { info: [14.7386, 15.8724], plus: [23.5864, 23.5864], slider: [125.845, 15.8726] }
  for (const [key, [width, height]] of Object.entries(dimensions)) {
    const root = readFileSync(resolve('public' + regionPanelAssets[key]), 'utf8').match(/<svg[^>]*>/)[0]
    assert.equal(Number(root.match(/width="([\d.]+)"/)[1]), width)
    assert.equal(Number(root.match(/height="([\d.]+)"/)[1]), height)
  }
})
