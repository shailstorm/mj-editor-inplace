import { outputDocument, regionDocument } from './fixtures/documents.js'
import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { Children, isValidElement, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { build } from 'vite'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { initialDocument, editResult, toggleResultFavorite } from '../src/editor/model/document.js'
import { imageLayout, regionBounds, workspaceBox } from '../src/editor/model/layout.js'

let PromptCard, ReferenceImages, ImageWorkspace, ResultImages, ProjectsDialog, Toolbar, HistoryToolbar, CanvasProportions, Topbar, HelpDialog, HelpButton, Navigation, useImageGestures, useEditor, Editor
before(async () => {
  const outDir = 'node_modules/.cache/editor-component-tests'
  await build({
    logLevel: 'silent',
    build: { ssr: resolve('tests/fixtures/editor-components.jsx'), outDir, emptyOutDir: true },
  })
  const components = await import(pathToFileURL(resolve(outDir, 'editor-components.js')))
  ;({ PromptCard, ReferenceImages, ImageWorkspace, ResultImages, ProjectsDialog, Toolbar, HistoryToolbar, CanvasProportions, Topbar, HelpDialog, HelpButton, Navigation, useImageGestures, useEditor, Editor } = components)
})

function workspaceProps(document, overrides = {}) {
  const viewport = { width: 1600, height: 1043 }
  return { document, layout: imageLayout(document, viewport), tool: 'cursor', actions: {}, ...overrides }
}

function resultStrip(props) {
  let strip
  function Capture() {
    strip = ResultImages(props)
    return strip
  }
  renderToStaticMarkup(createElement(Capture))
  return strip
}

function selectionGesture(document, tool = 'cursor', viewport = { width: 1600, height: 1043 }, actions = {}, cropDraft) {
  let current = document
  const commits = []
  let gestures
  const layout = imageLayout(document, viewport)
  function Capture() {
    // Expose handlers without mounting browser effects.
    // eslint-disable-next-line react/globals
    gestures = useImageGestures({
      document,
      history: {
        preview(patch) { current = { ...current, ...patch } },
        commit(before) { commits.push(before) },
      },
      actions,
      tool,
      layout,
      cropDraft,
      closePanel() {},
    })
    return null
  }
  renderToStaticMarkup(createElement(Capture))
  const board = {
    getBoundingClientRect: () => ({ left: 82, top: 0 }),
    setPointerCapture() {},
  }
  gestures.boardRef.current = board
  function event(x, y, imageId, { shiftKey = false, button = 0, corner, resizeTarget, moveRegion } = {}) {
    return {
      clientX: 82 + layout.x + x * layout.scale,
      clientY: layout.y + y * layout.scale,
      button,
      pointerId: 1,
      shiftKey,
      currentTarget: board,
      target: {
        closest(selector) {
          if (selector === '[data-image]' && imageId) return { dataset: { image: imageId } }
          if (selector === '[data-resize-corner]' && corner) return { dataset: { resizeCorner: corner, resizeTarget } }
          if (selector === '[data-region-move]' && moveRegion) return { dataset: {} }
          return null
        },
      },
    }
  }
  return { gestures, event, commits, document: () => current }
}

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`)

test('the editor renders without a page-wide scaling transform at different window sizes', () => {
  const originalWidth = globalThis.innerWidth
  const originalHeight = globalThis.innerHeight
  const originalMatchMedia = globalThis.matchMedia
  try {
    for (const [width, coarsePointer] of [[390, true], [800, true], [810, true], [1100, false], [1200, false], [1201, false], [1366, true], [1366, false], [1600, false]]) {
      globalThis.innerWidth = width
      globalThis.innerHeight = 844
      globalThis.matchMedia = () => ({ matches: coarsePointer })
      const html = renderToStaticMarkup(createElement(Editor))
      assert.doesNotMatch(html, /scale\(|editor-stage/)
      assert.match(html, /Editor tools/)
      assert.match(html, /All Projects/)
      if (width < 768) {
        assert.match(html, /mobile-navigation/)
      } else {
        assert.doesNotMatch(html, /mobile-navigation/)
      }
      assert.match(html, /class="canvas-proportions"/)
      assert.equal((html.match(/role="toolbar"/g) ?? []).length, 1)
      assert.match(html, /aria-label="Image prompt panel"/)
      if (width <= 1200 || (width <= 1366 && coarsePointer)) {
        assert.doesNotMatch(html, /class="projects-label"/)
        assert.match(html, /prompt-panel-collapsible/)
        assert.match(html, /aria-label="Expand prompt options" aria-expanded="false"/)
        assert.match(html, /<header[^>]*>[\s\S]*aria-label="Image prompt panel"[\s\S]*aria-label="Help and keyboard shortcuts"[\s\S]*<\/header>/)
      } else {
        assert.match(html, /class="projects-label">All Projects/)
        assert.doesNotMatch(html, /prompt-panel-collapsible|Expand prompt options/)
        assert.match(html, /disabled="">Generate</)
      }
    }
  } finally {
    if (originalWidth === undefined) delete globalThis.innerWidth
    else globalThis.innerWidth = originalWidth
    if (originalHeight === undefined) delete globalThis.innerHeight
    else globalThis.innerHeight = originalHeight
    if (originalMatchMedia === undefined) delete globalThis.matchMedia
    else globalThis.matchMedia = originalMatchMedia
  }
})

test('the workspace starts with one image and no selection or image operations', () => {
  let editor
  function Capture() {
    // eslint-disable-next-line react/globals
    editor = useEditor({ notify() {} })
    return null
  }
  renderToStaticMarkup(createElement(Capture))
  assert.deepEqual(editor.document, initialDocument())
  assert.equal(editor.tool, 'cursor')
  assert.equal(editor.history.canUndo, false)
  assert.equal(editor.history.canRedo, false)
  assert.equal(editor.promptOpen, false)
  const html = renderToStaticMarkup(createElement(ImageWorkspace, workspaceProps(editor.document)))
  assert.doesNotMatch(html, /selection-box|region-mask|prompt-card|image-operations|canvas-texture|canvas-world/)
  assert.equal((html.match(/data-image=/g) ?? []).length, 1)
})

test('toolbar, topbar, and help omit canvas navigation', () => {
  const html = [Toolbar, Topbar, HelpDialog].map((component) => renderToStaticMarkup(createElement(component, {}))).join('')
  assert.doesNotMatch(html, /Pan|Zoom|zoom|Fit canvas|Reset view|Space \+ drag|Select multiple/)
  assert.match(html, /Rectangle selection/)
  assert.match(html, /All Projects/)
})

test('the side navigation contains static icons and no interactive controls', () => {
  const navigation = Navigation()
  const html = renderToStaticMarkup(navigation)
  assert.match(html, /aria-disabled="true"/)
  assert.match(html, /nav-item active/)
  assert.equal((html.match(/role="img"/g) ?? []).length, 12)
  assert.doesNotMatch(html, /<button|<a[ >]|tabindex=|role="button"/)
  assert.equal(find(navigation, (node) => Boolean(node.props.onClick)), null)
})

test('mobile navigation shows four labeled static icons', () => {
  const html = renderToStaticMarkup(createElement(Navigation, { mobile: true }))
  assert.match(html, /class="mobile-navigation"/)
  for (const label of ['Menu', 'Explore', 'Create', 'Organize']) assert.match(html, new RegExp(`>${label}</span>`))
  assert.equal((html.match(/role="img"/g) ?? []).length, 4)
  assert.doesNotMatch(html, /<button|<a[ >]|tabindex=|role="button"/)
})

test('mobile proportions remain attached above the canvas separately from the bottom toolbar', () => {
  const layout = imageLayout(initialDocument(), { width: 390, height: 844 })
  const menu = CanvasProportions({ box: layout.proportions, value: 'original' })
  near(menu.props.style.left, layout.canvas.x + layout.canvas.width)
  near(menu.props.style.top + 38 + 12, layout.canvas.y)
  assert.doesNotMatch(renderToStaticMarkup(menu), /Editor tools|Undo|Redo/)
})

test('the separate Help button opens help and the graphic close button dismisses it', () => {
  let open = false
  const button = HelpButton({ open, onClick: () => { open = true } })
  assert.equal(button.props.name, 'CircleQuestion')
  assert.equal(button.props['aria-haspopup'], 'dialog')
  button.props.onClick()
  assert.equal(open, true)
  const help = HelpDialog({ onClose: () => { open = false } })
  const dialog = help.type(help.props)
  const close = find(dialog, (node) => node.props['aria-label'] === 'Close help')
  assert.ok(find(close, (node) => node.type === 'svg'))
  close.props.onClick()
  assert.equal(open, false)
})

test('All Projects retains its accessible name and action when mobile shows only an arrow', () => {
  let opened = false
  const topbar = Topbar({ mobile: true, toggleProjects: () => { opened = true } })
  const button = find(topbar, (node) => node.type === 'button')
  assert.equal(button.props['aria-label'], 'All Projects')
  button.props.onClick()
  assert.equal(opened, true)
  const html = renderToStaticMarkup(topbar)
  assert.doesNotMatch(html, /projects-label|Editor tools/)
  assert.match(html, /<img/)
})

test('the toolbar groups tools and history with working actions, independently of All Projects', () => {
  const tools = renderToStaticMarkup(createElement(Toolbar, { tool: 'cursor' }))
  assert.match(tools, /Editor tools/)
  assert.match(tools, /Undo/)
  assert.match(tools, /Redo/)
  assert.match(tools, /tool-group history-toolbar/)
  const called = []
  const history = HistoryToolbar({ canUndo: true, canRedo: false, onUndo: () => called.push('undo'), onRedo: () => called.push('redo') })
  const html = renderToStaticMarkup(history)
  assert.match(html, /Edit history/)
  assert.doesNotMatch(html, /Rectangle selection|Magic wand|floating/)
  const undo = find(history, (node) => node.props.label === 'Undo (⌘Z)')
  const redo = find(history, (node) => node.props.label === 'Redo (⇧⌘Z)')
  assert.equal(undo.props.disabled, false)
  assert.equal(redo.props.disabled, true)
  undo.props.onClick()
  assert.deepEqual(called, ['undo'])
})

test('projects shows the current image and upload action', () => {
  const html = renderToStaticMarkup(createElement(ProjectsDialog, { image: '/my-photo.png' }))
  assert.match(html, /Current image/)
  assert.match(html, /my-photo.png/)
  assert.match(html, /Upload an image/)
})

test('the variations sidebar shows newest first and opens the chosen image in place', () => {
  const document = outputDocument()
  let chosen
  const strip = resultStrip({ results: document.results, onEdit(id) { chosen = id } })
  const button = find(strip, (node) => node.props['aria-label'] === 'Edit variation 2')
  assert.equal(button.type, 'button')
  button.props.onClick()
  assert.equal(chosen, document.results.at(-2).id)
  const html = renderToStaticMarkup(strip)
  assert.ok(html.indexOf(document.results.at(-1).src) < html.indexOf(document.results[0].src))
  assert.equal(document.results[0].id, 'result-0')
  assert.doesNotMatch(html, /left:|top:|data-image|data-resize/)
  assert.equal(resultStrip({ results: [] }), null)
  const workspace = renderToStaticMarkup(createElement(ImageWorkspace, workspaceProps(document)))
  for (const result of document.results) assert.ok(!workspace.includes(result.src))
})

test('favorite hearts add and remove the correct variation without opening the image', () => {
  let document = outputDocument()
  const marked = document.results[1].id
  document = { ...document, results: document.results.map((result) => ({ ...result, favorite: result.id === marked })) }
  let chosen
  const render = () => resultStrip({
    results: document.results,
    onEdit(id) { chosen = id },
    onToggleFavorite(id) { document = { ...document, ...toggleResultFavorite(document, id) } },
  })
  const remove = find(render(), (node) => node.props['aria-label'] === 'Remove variation 3 from favorites')
  assert.equal(remove.type, 'button')
  assert.equal(remove.props['aria-pressed'], true)
  remove.props.onClick()
  assert.equal(chosen, undefined)
  assert.ok(document.results.every((result) => !result.favorite))
  const add = find(render(), (node) => node.props['aria-label'] === 'Add variation 3 to favorites')
  assert.equal(add.props['aria-pressed'], false)
  assert.match(renderToStaticMarkup(add), /fill="none" stroke="white"/)
  add.props.onClick()
  assert.equal(chosen, undefined)
  assert.deepEqual(document.results.filter((result) => result.favorite).map((result) => result.id), [marked])
  const html = renderToStaticMarkup(render())
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1)
  assert.match(html, /fill="#ff533e" stroke="white"/)
  find(render(), (node) => node.props['aria-label'] === 'Edit variation 3 (favorite)').props.onClick()
  assert.equal(chosen, marked)
})

test('clicking a photo selects it and exposes image handles without creating an undo entry', () => {
  const document = outputDocument()
  for (const shiftKey of [false, true]) {
    const session = selectionGesture(document)
    session.gestures.pointerHandlers.onPointerDown(session.event(400, 200, document.imageId, { shiftKey }))
    session.gestures.pointerHandlers.onPointerMove(session.event(800, 600))
    session.gestures.pointerHandlers.onPointerUp()
    assert.deepEqual(session.document().selected, [document.imageId])
    assert.deepEqual(session.document().imageFrame, document.imageFrame)
    assert.deepEqual(session.document().results, document.results)
    assert.equal(session.commits.length, 0)
    const html = renderToStaticMarkup(createElement(ImageWorkspace, workspaceProps(session.document())))
    assert.doesNotMatch(html, /image-operations|Image operations/)
    assert.equal((html.match(/data-resize-target="image"/g) ?? []).length, 4)
  }
})

test('image resizing previews freely and creates one undo entry while its canvas stays fixed', () => {
  const document = initialDocument()
  const session = selectionGesture(document)
  session.gestures.pointerHandlers.onPointerDown(session.event(1100, 800, null, { corner: 'se', resizeTarget: 'image' }))
  for (const amount of [50, 100, 200]) {
    session.gestures.pointerHandlers.onPointerMove(session.event(1100 - amount, 800 - amount))
  }
  session.gestures.pointerHandlers.onPointerUp()
  assert.ok(session.document().imageFrame.width < document.imageFrame.width)
  near(session.document().imageFrame.width / session.document().imageFrame.height, document.imageFrame.width / document.imageFrame.height)
  assert.deepEqual(session.document().canvasFrame, document.canvasFrame)
  assert.equal(session.commits.length, 1)
  assert.deepEqual(session.commits[0], document)
})

test('crop handle and image drags update only the draft until the crop is applied', () => {
  const document = initialDocument()
  const draft = { sourceFrame: document.imageFrame, box: { x: 443, y: 170, width: 400, height: 400 } }
  for (const resize of [false, true]) {
    let next
    const session = selectionGesture(document, 'crop', undefined, { previewCrop(value) { next = value } }, draft)
    session.gestures.pointerHandlers.onPointerDown(session.event(600, 400, resize ? null : document.imageId, resize ? { corner: 'se', resizeTarget: 'crop' } : {}))
    session.gestures.pointerHandlers.onPointerMove(session.event(650, 420))
    session.gestures.pointerHandlers.onPointerUp()
    assert.ok(next)
    if (resize) {
      near(next.box.width, 450)
      near(next.box.height, 420)
    } else {
      near(next.sourceFrame.x, draft.sourceFrame.x + 50)
      near(next.sourceFrame.y, draft.sourceFrame.y + 20)
    }
    assert.deepEqual(session.document(), document)
    assert.equal(session.commits.length, 0)
    session.gestures.cancelGesture()
  }
})

test('crop renders a faded source, eight crop handles, and no title tooltip', () => {
  const document = initialDocument()
  const cropDraft = { sourceFrame: document.imageFrame, box: { x: 443, y: 170, width: 400, height: 400 } }
  const html = renderToStaticMarkup(createElement(ImageWorkspace, workspaceProps(document, { tool: 'crop', cropDraft })))
  assert.match(html, /opacity:0.25/)
  assert.match(html, /crop-preview-image/)
  assert.equal((html.match(/data-resize-target="crop"/g) ?? []).length, 8)
  const toolbar = Toolbar({ tool: 'crop' })
  const button = find(toolbar, (node) => node.props['data-tool'] === 'crop')
  assert.equal(button.props.title, undefined)
})

test('dragging empty workspace clears the selection and never selects variations', () => {
  const document = outputDocument()
  const session = selectionGesture(document, 'rectangle')
  session.gestures.pointerHandlers.onPointerDown(session.event(10, 10))
  session.gestures.pointerHandlers.onPointerMove(session.event(1400, 1000))
  session.gestures.pointerHandlers.onPointerUp()
  assert.deepEqual(session.document().selected, [])
  assert.equal(session.document().region, null)
  assert.deepEqual(session.document().results, document.results)
  assert.equal(session.commits.length, 0)
})

test('clearing and redrawing a region preserves the prompt and reference weights', () => {
  const document = {
    ...regionDocument(),
    prompt: 'keep the same edit',
    references: [{ id: 'reference', src: '/reference.png', weight: 70 }],
  }
  const cleared = selectionGesture(document, 'rectangle')
  cleared.gestures.pointerHandlers.onPointerDown(cleared.event(10, 10))
  cleared.gestures.pointerHandlers.onPointerUp()
  assert.equal(cleared.document().region, null)
  assert.equal(cleared.document().prompt, document.prompt)
  assert.deepEqual(cleared.document().references, document.references)

  const redrawn = selectionGesture(cleared.document(), 'rectangle')
  redrawn.gestures.pointerHandlers.onPointerDown(redrawn.event(400, 200, document.imageId))
  redrawn.gestures.pointerHandlers.onPointerUp(redrawn.event(500, 300))
  assert.ok(redrawn.document().region)
  assert.notDeepEqual(redrawn.document().region, document.region)
  assert.equal(redrawn.document().prompt, document.prompt)
  assert.deepEqual(redrawn.document().references, document.references)
})

test('outside clicks and photo clicks keep a generated batch and its prompt target until an actual image edit', () => {
  for (const region of [null, { x: 100, y: 100, width: 150, height: 150 }]) {
    const document = {
      ...outputDocument(), region, prompt: 'keep this edit',
      references: [{ id: 'reference', src: '/reference.png', weight: 70 }],
      promptOutputIds: ['result-0', 'result-1', 'result-2', 'result-3'],
    }
    for (const tool of ['cursor', 'rectangle', 'lasso']) {
      const outside = selectionGesture(document, tool)
      outside.gestures.pointerHandlers.onPointerDown(outside.event(10, 10))
      outside.gestures.pointerHandlers.onPointerUp()
      assert.deepEqual(outside.document(), document)
      assert.equal(outside.commits.length, 0)
    }
    const clicked = selectionGesture(document)
    clicked.gestures.pointerHandlers.onPointerDown(clicked.event(400, 200, document.imageId))
    clicked.gestures.pointerHandlers.onPointerUp(clicked.event(400, 200, document.imageId))
    assert.deepEqual(clicked.document(), document)
    assert.equal(clicked.commits.length, 0)

    const resized = selectionGesture(document)
    resized.gestures.pointerHandlers.onPointerDown(resized.event(1100, 800, null, { corner: 'se', resizeTarget: 'image' }))
    resized.gestures.pointerHandlers.onPointerUp(resized.event(1000, 700))
    assert.deepEqual(resized.document().promptOutputIds, [])
    assert.equal(resized.document().prompt, document.prompt)
    assert.deepEqual(resized.document().references, document.references)
    assert.equal(resized.commits.length, 1)
  }
})

test('middle-button drags do not edit or navigate the workspace', () => {
  const document = outputDocument()
  const session = selectionGesture(document)
  session.gestures.pointerHandlers.onPointerDown(session.event(400, 200, document.imageId, { button: 1 }))
  session.gestures.pointerHandlers.onPointerMove(session.event(800, 600))
  session.gestures.pointerHandlers.onPointerUp()
  assert.deepEqual(session.document(), document)
})

test('magic-wand clicks target the active image using document coordinates after automatic fitting', () => {
  const base = outputDocument()
  const document = { ...base, ...editResult(base, base.results[0].id) }
  let clicked
  const session = selectionGesture(document, 'auto', { width: 800, height: 600 }, {
    autoSelect(id, point, element) { clicked = { id, point, elementId: element.dataset.image } },
  })
  session.gestures.pointerHandlers.onPointerDown(session.event(400, 200, document.imageId))
  assert.equal(clicked.id, document.imageId)
  assert.equal(clicked.elementId, document.imageId)
  near(clicked.point.x, 400)
  near(clicked.point.y, 200)
})

test('a wand mask overlays the photo without replacing it or exposing image operations', () => {
  const document = { ...regionDocument(), region: {
    x: 10, y: 10, width: 30, height: 40,
    outline: { path: 'M10 10L40 10L40 50L10 50Z', width: 100, height: 100 },
  } }
  const html = renderToStaticMarkup(createElement(ImageWorkspace, workspaceProps(document, { tool: 'auto' })))
  assert.match(html, /class="region-mask"/)
  assert.match(html, /vector-effect="non-scaling-stroke"/)
  assert.ok(html.includes(`src="${document.image}"`))
  assert.doesNotMatch(html, /selection-box|image-operations/)
})

test('rectangle and lasso selections work on the active image at different window sizes', () => {
  for (const viewport of [{ width: 1600, height: 1043 }, { width: 800, height: 600 }]) {
    for (const tool of ['rectangle', 'lasso']) {
      const document = initialDocument()
      const session = selectionGesture(document, tool, viewport)
      session.gestures.pointerHandlers.onPointerDown(session.event(400, 200, document.imageId))
      session.gestures.pointerHandlers.onPointerMove(session.event(500, 200))
      session.gestures.pointerHandlers.onPointerMove(session.event(450, 300))
      assert.equal(PromptCard(promptProps(session.document(), { isSelectingRegion: true })), null)
      assert.equal(session.commits.length, 0)
      session.gestures.pointerHandlers.onPointerUp(session.event(450, 300))
      const current = session.document()
      near(current.region.height, 100)
      near(current.region.width, tool === 'lasso' ? 100 : 50)
      assert.deepEqual(current.imageFrame, document.imageFrame)
      assert.equal(session.commits.length, 1)
      if (tool === 'lasso') assert.match(current.region.outline.path, /Z$/)
      assert.equal(PromptCard(promptProps(current)), null)
      const html = renderToStaticMarkup(createElement(ImageWorkspace, workspaceProps(current, { tool })))
      assert.doesNotMatch(html, /image-operations/)
    }
  }
})

test('rectangle selection on an opened variation clamps to the image edge', () => {
  const base = outputDocument()
  const document = { ...base, ...editResult(base, base.results[0].id) }
  const frame = document.imageFrame
  const session = selectionGesture(document, 'rectangle')
  session.gestures.pointerHandlers.onPointerDown(session.event(frame.x + 10, frame.y + 20, document.imageId))
  session.gestures.pointerHandlers.onPointerMove(session.event(frame.x + 2000, frame.y + 2000))
  session.gestures.pointerHandlers.onPointerUp()
  const box = regionBounds(session.document().region, frame)
  near(box.x, frame.x + 10)
  near(box.y, frame.y + 20)
  near(box.width, frame.width - 10)
  near(box.height, frame.height - 20)
  assert.deepEqual(session.document().imageFrame, frame)
})

test('cancelled and undersized selections restore the previous document without an undo entry', () => {
  for (const cancel of [false, true]) {
    const document = regionDocument()
    const session = selectionGesture(document, 'lasso')
    session.gestures.pointerHandlers.onPointerDown(session.event(400, 200, document.imageId))
    if (cancel) {
      session.gestures.pointerHandlers.onPointerMove(session.event(500, 300))
      session.gestures.cancelGesture()
    } else session.gestures.pointerHandlers.onPointerUp()
    assert.deepEqual(session.document(), document)
    assert.equal(session.commits.length, 0)
  }
})

test('rectangle regions can move and resize with one history entry while the image stays fixed', () => {
  const document = { ...regionDocument(), region: { x: 100, y: 100, width: 200, height: 150 } }
  for (const resize of [false, true]) {
    const session = selectionGesture(document, 'rectangle')
    session.gestures.pointerHandlers.onPointerDown(session.event(600, 400, null, resize ? { corner: 'se' } : { moveRegion: true }))
    session.gestures.pointerHandlers.onPointerMove(session.event(620, 410))
    session.gestures.pointerHandlers.onPointerUp(session.event(650, 430))
    const region = session.document().region
    near(region.x, resize ? 100 : 150)
    near(region.y, resize ? 100 : 130)
    near(region.width, resize ? 250 : 200)
    near(region.height, resize ? 180 : 150)
    assert.deepEqual(session.document().imageFrame, document.imageFrame)
    assert.equal(session.commits.length, 1)
  }
})

test('region outlines track the displayed image and only rectangles expose handles', () => {
  for (const tool of ['cursor', 'rectangle', 'lasso']) {
    const document = regionDocument()
    const props = workspaceProps(document, { tool })
    const workspace = ImageWorkspace(props)
    const outline = find(workspace, (node) => node.props.className === 'region-selection')
    assert.deepEqual(outline.props.box, workspaceBox(regionBounds(document.region, document.imageFrame), props.layout))
    const html = renderToStaticMarkup(workspace)
    assert.equal((html.match(/data-resize-target="region"/g) ?? []).length, tool === 'rectangle' ? 4 : 0)
    assert.equal(html.includes('data-region-move="true"'), tool === 'rectangle')
  }
})

function find(element, predicate) {
  if (!isValidElement(element)) return null
  if (predicate(element)) return element
  for (const child of Children.toArray(element.props.children)) {
    const match = find(child, predicate)
    if (match) return match
  }
  return null
}

function promptProps(document, overrides = {}) {
  return {
    document,
    viewport: { width: 1600, height: 1043 },
    layout: imageLayout(document, { width: 1600, height: 1043 }),
    inputRef: { current: null },
    busy: false,
    suggestionsOpen: false,
    actions: {},
    closeSuggestions() {},
    openReferencePicker() {},
    ...overrides,
  }
}

test('empty references render neither the heading nor the gray upload tile', () => {
  assert.equal(ReferenceImages({ images: [] }), null)
  const card = PromptCard(promptProps({ ...regionDocument(), region: null }, { promptOpen: true }))
  const html = renderToStaticMarkup(card)
  assert.doesNotMatch(html, /reference-heading|add-reference|reference-images/)
  assert.match(html, /Add reference image/)
  assert.doesNotMatch(card.props.className, /expanded/)
})

test('focusing and typing in an empty prompt cannot open a reference area or move the image', () => {
  const document = { ...regionDocument(), region: null }
  const frame = structuredClone(document.imageFrame)
  const props = promptProps(document, {
    promptOpen: true,
    actions: {
      setPrompt(value) {
        document.prompt = value
      },
    },
  })
  const before = PromptCard(props)
  const input = find(before, (element) => element.type === 'input')
  assert.equal(input.props.onFocus, undefined)
  input.props.onChange({ target: { value: 'change the boots' } })
  const after = PromptCard(props)
  assert.equal(document.prompt, 'change the boots')
  assert.deepEqual(document.references, [])
  assert.deepEqual(document.imageFrame, frame)
  assert.deepEqual(after.props.style, before.props.style)
  assert.doesNotMatch(renderToStaticMarkup(after), /reference-heading|add-reference/)
})

test('opening the attachment picker does not expand the card before a file is chosen', () => {
  let pickerOpened = false
  const props = promptProps({ ...regionDocument(), region: null }, {
    promptOpen: true,
    openReferencePicker() {
      pickerOpened = true
    },
  })
  const card = PromptCard(props)
  const button = find(card, (element) => element.props.label === 'Add reference image')
  button.props.onClick()
  assert.equal(pickerOpened, true)
  assert.deepEqual(props.document.references, [])
  assert.doesNotMatch(renderToStaticMarkup(PromptCard(props)), /reference-heading|add-reference/)
})

test('attaching a photo expands references and removing the last photo collapses them', () => {
  const document = { ...regionDocument(), region: null }
  const props = promptProps(document, { promptOpen: true })
  document.references = [{ id: 'upload', src: '/uploaded-photo.png', weight: 30 }]
  let card = PromptCard(props)
  assert.match(card.props.className, /expanded/)
  assert.match(renderToStaticMarkup(card), /reference-heading/)
  assert.match(renderToStaticMarkup(card), /uploaded-photo.png/)

  const references = ReferenceImages({
    images: document.references,
    onRemove(index) {
      document.references = document.references.filter((_, i) => i !== index)
    },
  })
  find(
    references,
    (element) => element.props['aria-label'] === 'Remove reference 1',
  ).props.onClick()
  card = PromptCard(props)
  assert.doesNotMatch(card.props.className, /expanded/)
  assert.doesNotMatch(renderToStaticMarkup(card), /reference-heading|add-reference|uploaded-photo/)
})
