// Katman modüllerinin tek toplanma noktası; her yeni katman burada bir satırla kaydedilir.

import { registerLayers } from '../core/layerRegistry'
import type { LayerModule } from '../core/types'
import { districtBoundaryLayer } from './districtBoundary'
import { districtMaskLayer } from './districtMask'

const layers: LayerModule[] = [districtMaskLayer, districtBoundaryLayer]

export function installLayers(): void {
  registerLayers(layers)
}
