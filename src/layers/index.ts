// Katman modüllerinin tek toplanma noktası; her yeni katman burada bir satırla kaydedilir.

import { registerLayers } from '../core/layerRegistry'
import type { LayerModule } from '../core/types'

const layers: LayerModule[] = []

export function installLayers(): void {
  registerLayers(layers)
}
