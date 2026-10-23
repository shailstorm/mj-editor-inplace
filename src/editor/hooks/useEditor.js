import { useState } from 'react'
import { useDocumentHistory } from './useDocumentHistory.js'
import { useGeneration } from './useGeneration.js'
import { useCropSession } from './useCropSession.js'
import {
  initialDocument,
  documentForImage,
  deleteSelection,
  appendResults,
  editResult,
  favoriteResults,
  toggleResultFavorite,
} from '../model/document.js'
import { selectedImages, selectImage } from '../model/selection.js'
import { SAMPLE_PROMPT } from '../model/assets.js'
import { imagePoint } from '../model/geometry.js'
import { createReference, MAX_REFERENCES, setReferenceWeight } from '../model/references.js'
import { changeAura, promptRequest } from '../model/prompts.js'
import { IMAGE_SIZE } from '../model/layout.js'
import { changeCanvasProportion, imageDimensionsPatch } from '../model/canvas.js'
import { selectPhotoRegion } from '../services/magic-wand.js'
import { visibleImageFrame } from '../model/image-transforms.js'
import { downloadImages, readImageFiles } from '../services/files.js'

export function useEditor({ notify }) {
  const history = useDocumentHistory(initialDocument)
  const { document, update, preview } = history
  const [tool, setTool] = useState('cursor')
  const [panel, setPanel] = useState(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const generation = useGeneration(notify)
  const crop = useCropSession(history)

  function undo() {
    if (crop.cancel()) {
      setTool('cursor')
      return
    }
    if (!history.canUndo) return
    generation.cancel()
    setPromptOpen(false)
    history.undo()
  }

  function redo() {
    if (crop.cancel()) setTool('cursor')
    if (!history.canRedo) return
    generation.cancel()
    setPromptOpen(false)
    history.redo()
  }

  function openImage(src) {
    crop.cancel()
    setPromptOpen(false)
    update(documentForImage(src))
    setTool('cursor')
  }

  function selectTool(id) {
    generation.cancel()
    if (id === 'crop' && document.image) {
      if (crop.apply()) setTool('cursor')
      else {
        crop.begin(document)
        preview({ selected: [document.imageId], region: null, promptOutputIds: [] })
        setTool('crop')
      }
      setPanel(null)
      return
    }
    crop.apply()
    setTool(id)
    setPanel(null)
  }

  function autoSelect(id, point, element) {
    if (!document.image || id !== document.imageId) return
    const image = { id, src: document.image, ...visibleImageFrame(document) }
    setPanel(null)
    try {
      const size = {
        width: IMAGE_SIZE.width,
        height: (image.height * IMAGE_SIZE.width) / image.width,
      }
      const local = imagePoint(point, image, size)
      const region = selectPhotoRegion(element, local, image, undefined, document.imageFrame)
      if (!region) {
        notify('Click a visible part of the photo to select it.')
        return
      }
      update({
        prompt: document.prompt,
        references: document.references,
        selected: [id],
        region,
        promptOutputIds: [],
      })
    } catch (error) {
      notify(error.message || 'Could not read this photo. Try uploading it again.')
    }
  }

  function applySuggestion() {
    update({ prompt: SAMPLE_PROMPT, promptOutputIds: [] })
    setPanel(null)
  }

  function setPrompt(prompt) {
    generation.cancel()
    preview({ prompt, promptOutputIds: [] })
    if (prompt === '/') setPanel('suggestions')
    else if (panel === 'suggestions') setPanel(null)
  }

  async function generate() {
    if (generation.busy) return
    const request = promptRequest(document)
    if (!request) {
      if (!document.image) return
      setPanel('suggestions')
      return
    }
    setPanel(null)
    const results = await generation.run(request)
    if (!results) return
    const batchId = crypto.randomUUID()
    setPromptOpen(false)
    update((current) => appendResults(current, results, batchId, {
      forRegion: Boolean(request.region),
    }))
    notify('Sample variations ready. Choose an output to edit it in place.')
  }

  async function upload(files, reference = false) {
    const { images, rejectedCount } = await readImageFiles(files)
    if (rejectedCount) notify('Choose image files smaller than 15 MB.')
    if (!images.length) return
    if (reference) {
      generation.cancel()
      update((current) => ({
        references: [...current.references, ...images.map(createReference)].slice(0, MAX_REFERENCES),
        promptOutputIds: [],
      }))
      return
    }
    generation.cancel()
    openImage(images[0])
    setPanel(null)
  }

  function downloadSelected() {
    const results = selectedImages(document)
    if (!results.length) return
    downloadImages(results)
    notify(`${results.length} image${results.length === 1 ? '' : 's'} downloaded`)
  }

  function editSelected() {
    if (!selectedImages(document).length) return
    setPanel(null)
    setPromptOpen(true)
  }

  function startEditingResult(id) {
    if (document.image && id === document.imageId) return
    if (crop.cancel()) setTool('cursor')
    generation.cancel()
    setPromptOpen(false)
    update((current) => editResult(current, id))
  }

  function selectPhoto(id) {
    generation.cancel()
    setPromptOpen(false)
    preview((current) => selectImage(current, id))
    setPanel(null)
  }

  function selectAll() {
    generation.cancel()
    setPromptOpen(false)
    preview(selectImage(document, document.imageId))
  }

  function removeReference(index) {
    generation.cancel()
    update((current) => ({
      references: current.references.filter((_, i) => i !== index),
      promptOutputIds: [],
    }))
  }

  function changeReferenceWeight(id, weight) {
    generation.cancel()
    preview((current) => ({
      references: setReferenceWeight(current.references, id, weight),
      promptOutputIds: [],
    }))
  }

  function setAura(patch) {
    generation.cancel()
    preview((current) => ({
      aura: changeAura(current.aura, patch),
      promptOutputIds: [],
    }))
  }

  return {
    document,
    history,
    tool,
    setTool,
    panel,
    setPanel,
    busy: generation.busy,
    promptOpen,
    cropDraft: crop.draft,
    actions: {
      undo,
      redo,
      openImage,
      selectTool,
      autoSelect,
      previewCrop: crop.preview,
      applyCrop: () => {
        if (crop.apply()) setTool('cursor')
      },
      cancelCrop: () => {
        if (!crop.cancel()) return false
        setTool('cursor')
        return true
      },
      setCanvasProportion: (id) => {
        generation.cancel()
        update((current) => changeCanvasProportion(current, id))
      },
      setImageDimensions: (id, src, size) => preview((current) => imageDimensionsPatch(current, id, src, size)),
      applySuggestion,
      setPrompt,
      setAura,
      generate,
      upload,
      downloadSelected,
      editSelected,
      editResult: startEditingResult,
      addFavorites: (ids) => update((current) => favoriteResults(current, ids)),
      toggleFavorite: (id) => update((current) => toggleResultFavorite(current, id)),
      selectImage: selectPhoto,
      selectAll,
      deleteSelected: () => {
        crop.cancel()
        generation.cancel()
        setPromptOpen(false)
        update(deleteSelection)
      },
      removeReference,
      setReferenceWeight: changeReferenceWeight,
      cancelGeneration: generation.cancel,
      closePrompt: () => setPromptOpen(false),
      clearSelection: () => {
        generation.cancel()
        setPromptOpen(false)
        preview({ selected: [], region: null, promptOutputIds: [] })
      },
    },
  }
}
