import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assetUrls, publicAsset } from '../src/asset-urls.js'
import exportedAssets from '../src/figma-assets.json' with { type: 'json' }

test('production asset URLs stay inside the editor route without changing development paths', () => {
  assert.deepEqual(assetUrls('/'), exportedAssets)
  const production = assetUrls('/editor-inplace/')
  for (const [collection, assets] of Object.entries(exportedAssets)) {
    for (const [name, path] of Object.entries(assets)) {
      assert.equal(production[collection][name], `/editor-inplace${path}`)
    }
  }
  assert.equal(publicAsset('/icons/proportions.svg', '/editor-inplace/'), '/editor-inplace/icons/proportions.svg')
  for (const path of ['blob:https://shay.city/photo', 'data:image/png;base64,photo', 'https://example.com/photo.png', '//example.com/photo.png']) {
    assert.equal(publicAsset(path, '/editor-inplace/'), path)
  }
})

test('Vercel serves the editor and its assets at the same subpath proxied by shaysite', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.equal(config.buildCommand, 'npm run build:production')
  assert.deepEqual(config.rewrites, [
    { source: '/editor-inplace', destination: '/index.html' },
    { source: '/editor-inplace/:path*', destination: '/:path*' },
  ])
})
