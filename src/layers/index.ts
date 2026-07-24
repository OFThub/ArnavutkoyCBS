// Katman modüllerinin tek toplanma noktası; her yeni katman burada bir satırla kaydedilir.

import { registerLayers } from '../core/layerRegistry'
import type { LayerModule } from '../core/types'
import { aspectLayer } from './aspect'
import { buildingsLayer } from './buildings'
import { contourLayer } from './contour'
import { districtBoundaryLayer } from './districtBoundary'
import { districtMaskLayer } from './districtMask'
import { neighborDistrictsLayer } from './neighborDistricts'
import { workAreaMaskLayer } from './workArea'
import { healthFacilitiesLayer } from './healthFacilities'
import { hillshadeLayer } from './hillshade'
import { hypsometricLayer } from './hypsometric'
import { poiLayer } from './poi'
import { roadsLayer } from './roads'
import { slopeLayer } from './slope'
import { terrainClassLayer } from './terrainClass'
import { waterLayer } from './water'

const layers: LayerModule[] = [
  workAreaMaskLayer,
  districtMaskLayer,
  hypsometricLayer,
  slopeLayer,
  aspectLayer,
  terrainClassLayer,
  hillshadeLayer,
  contourLayer,
  waterLayer,
  buildingsLayer,
  roadsLayer,
  poiLayer,
  healthFacilitiesLayer,
  neighborDistrictsLayer,
  districtBoundaryLayer,
]

export function installLayers(): void {
  registerLayers(layers)
}
