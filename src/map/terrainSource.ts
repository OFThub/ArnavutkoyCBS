// 3B arazi ve gölgelendirmenin paylaştığı terrarium raster-dem kaynağı ve yükseklik abartısı denetimi.

import type { Map as MapLibreMap } from 'maplibre-gl'
import { SOURCES } from '../config/sources'

export const DEM_SOURCE_ID = 'dem-terrarium'
export const DEFAULT_EXAGGERATION = 1.5

export function ensureDemSource(map: MapLibreMap): void {
  if (map.getSource(DEM_SOURCE_ID)) return
  map.addSource(DEM_SOURCE_ID, {
    type: 'raster-dem',
    tiles: [SOURCES.demTerrarium],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 14,
    attribution: 'Yükselti: Mapzen / AWS Terrain Tiles',
  })
}

export function applyTerrain(map: MapLibreMap, enabled: boolean, exaggeration: number): void {
  if (!enabled) {
    map.setTerrain(null)
    return
  }
  ensureDemSource(map)
  map.setTerrain({ source: DEM_SOURCE_ID, exaggeration })
}
