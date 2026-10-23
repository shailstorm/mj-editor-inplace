import exportedAssets from './figma-assets.json' with { type: 'json' }

export function publicAsset(path, base = import.meta.env?.BASE_URL ?? '/') {
  if (!path.startsWith('/') || path.startsWith('//')) return path
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

export function assetUrls(base = '/') {
  return Object.fromEntries(Object.entries(exportedAssets).map(([collection, assets]) => [
    collection,
    Object.fromEntries(Object.entries(assets).map(([name, path]) => [name, publicAsset(path, base)])),
  ]))
}

export default assetUrls(import.meta.env?.BASE_URL ?? '/')
