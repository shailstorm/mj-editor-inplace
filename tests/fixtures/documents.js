import { createReference } from '../../src/editor/model/references.js'
import { initialDocument } from '../../src/editor/model/document.js'
import { resultImages, SAMPLE_PROMPT, sampleReferences } from '../../src/editor/model/assets.js'

export function regionDocument() {
  const document = initialDocument()
  return {
    ...document,
    selected: [document.imageId],
    region: { x: 426, y: 688, width: 225, height: 134 },
  }
}

export function promptingDocument() {
  return {
    ...regionDocument(),
    imageFrame: { x: 52, y: -350, width: 1245, height: 1245 },
    prompt: SAMPLE_PROMPT,
    references: sampleReferences.map(createReference),
  }
}

export function outputDocument() {
  return {
    ...initialDocument(),
    results: resultImages.map((src, index) => ({
      id: `result-${index}`,
      src,
    })),
    selected: ['source-original'],
  }
}
