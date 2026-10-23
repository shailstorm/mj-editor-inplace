import { publicAsset } from '../../asset-urls.js'

export const REGION_PANEL_WIDTH = 300

export const regionPanelAssets = {
  info: publicAsset('/figma/region-panel/info.svg'),
  plus: publicAsset('/figma/region-panel/plus.svg'),
  divider: publicAsset('/figma/region-panel/divider.svg'),
  dividerBottom: publicAsset('/figma/region-panel/divider-bottom.svg'),
  slider: publicAsset('/figma/region-panel/slider.svg'),
}

const sheep = publicAsset('/figma/region-panel/reference-sheep.png')
const antlers = publicAsset('/figma/region-panel/reference-antlers.png')

export const regionSampleImages = [sheep, antlers, sheep, sheep, antlers]
