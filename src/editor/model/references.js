export const DEFAULT_REFERENCE_WEIGHT = 30
export const MAX_REFERENCES = 6

export function createReference(src) {
  return { id: crypto.randomUUID(), src, weight: DEFAULT_REFERENCE_WEIGHT }
}

export function setReferenceWeight(references, id, weight) {
  const value = Number(weight)
  if (!Number.isFinite(value)) return references
  return references.map((reference) => reference.id === id
    ? { ...reference, weight: Math.max(0, Math.min(100, value)) }
    : reference)
}
