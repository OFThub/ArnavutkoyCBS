// Yükselti ızgarasından eğim, bakı ve TPI türevlerini bir kez hesaplayıp tüm katman ve araçlara paylaştırır.

import {
  classifyTerrain,
  elevationAt,
  gridStats,
  lngLatToGrid,
  slopeAspectGrid,
  standardDeviation,
  tpiGrid,
  type DemGrid,
  type GridStats,
  type TerrainClass,
} from '../core/terrain'
import { loadDemGrid } from './dem'

export const TPI_RADIUS = 5

export interface TerrainDerived {
  grid: DemGrid
  slopePercent: Float32Array
  slopeDegrees: Float32Array
  aspect: Float32Array
  tpi: Float32Array
  tpiStdDev: number
  elevation: GridStats
}

let derivedPromise: Promise<TerrainDerived> | null = null

export function loadTerrainDerived(
  onProgress?: (done: number, total: number) => void,
): Promise<TerrainDerived> {
  derivedPromise ??= (async () => {
    const grid = await loadDemGrid(onProgress)
    const { slopePercent, slopeDegrees, aspect } = slopeAspectGrid(grid)
    const tpi = tpiGrid(grid, TPI_RADIUS)
    return {
      grid,
      slopePercent,
      slopeDegrees,
      aspect,
      tpi,
      tpiStdDev: standardDeviation(tpi),
      elevation: gridStats(grid.data),
    }
  })().catch((error: unknown) => {
    derivedPromise = null
    throw error
  })

  return derivedPromise
}

export interface TerrainSample {
  elevation: number
  slopePercent: number
  slopeDegrees: number
  aspectDegrees: number
  tpi: number
  terrainClass: TerrainClass
}

export function terrainSampleAt(
  derived: TerrainDerived,
  lng: number,
  lat: number,
): TerrainSample | null {
  const { grid } = derived
  const [px, py] = lngLatToGrid(grid, lng, lat)
  if (px < 0 || py < 0 || px > grid.width - 1 || py > grid.height - 1) return null

  const index = Math.round(py) * grid.width + Math.round(px)
  const slopePercent = derived.slopePercent[index] ?? 0
  const slopeDegrees = derived.slopeDegrees[index] ?? 0
  const tpi = derived.tpi[index] ?? 0

  return {
    elevation: elevationAt(grid, lng, lat),
    slopePercent,
    slopeDegrees,
    aspectDegrees: derived.aspect[index] ?? -1,
    tpi,
    terrainClass: classifyTerrain(tpi, derived.tpiStdDev, slopeDegrees),
  }
}
