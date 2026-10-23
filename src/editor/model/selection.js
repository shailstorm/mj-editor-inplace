export function selectedImages(document) {
  return document.image && document.selected.includes(document.imageId)
    ? [{ id: document.imageId, src: document.image, ...document.imageFrame }]
    : []
}

export function selectedRegion(document) {
  return selectedImages(document).length ? document.region : null
}

export function selectImage(document, id) {
  // Reviewing a completed batch keeps its prompt and target until a real edit.
  if (document.promptOutputIds.length && (id == null || id === document.imageId)) return null
  return {
    selected: document.image && id === document.imageId ? [id] : [],
    region: null,
    promptOutputIds: [],
  }
}
