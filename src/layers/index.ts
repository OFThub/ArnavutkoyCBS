// Katman modüllerinin tek toplanma noktası; her yeni katman burada bir satırla kaydedilir.

import { registerLayers } from '../core/layerRegistry'
import type { LayerModule } from '../core/types'
import { aspectLayer } from './aspect'
import { contourLayer } from './contour'
import { districtBoundaryLayer } from './districtBoundary'
import { districtMaskLayer } from './districtMask'
import { hillshadeLayer } from './hillshade'
import { hypsometricLayer } from './hypsometric'
import { slopeLayer } from './slope'
import { terrainClassLayer } from './terrainClass'

const layers: LayerModule[] = [
  districtMaskLayer,
  hypsometricLayer,
  slopeLayer,
  aspectLayer,
  terrainClassLayer,
  hillshadeLayer,
  contourLayer,
  districtBoundaryLayer,
]

export function installLayers(): void {
  registerLayers(layers)
}
