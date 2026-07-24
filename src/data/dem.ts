// İlçe bbox'ı için DEM ızgarasını worker üzerinden üretir, tarayıcı veritabanında sürümlü olarak saklar.

import { DISTRICT } from '../config/district'
import { SOURCES } from '../config/sources'
import { cacheGet, cacheSet } from '../core/storage'
import { latToTileY, lngToTileX, type DemGrid } from '../core/terrain'
import type { DemRequest, DemResponse } from './demWorker'

export const DEM_ZOOM = 12
export const DEM_TILE_SIZE = 256

export interface DemExtent {
  zoom: number
  tileX0: number
  tileY0: number
  tilesX: number
  tilesY: number
}

interface CachedGrid {
  extent: DemExtent
  width: number
  height: number
  data: Float32Array
}

export function demExtent(zoom: number = DEM_ZOOM): DemExtent {
  const [west, south, east, north] = DISTRICT.bbox
  const tileX0 = Math.floor(lngToTileX(west, zoom))
  const tileX1 = Math.floor(lngToTileX(east, zoom))
  const tileY0 = Math.floor(latToTileY(north, zoom))
  const tileY1 = Math.floor(latToTileY(south, zoom))
  return {
    zoom,
    tileX0,
    tileY0,
    tilesX: tileX1 - tileX0 + 1,
    tilesY: tileY1 - tileY0 + 1,
  }
}

function cacheVersion(extent: DemExtent): string {
  return `${extent.zoom}/${extent.tileX0}/${extent.tileY0}/${extent.tilesX}x${extent.tilesY}`
}

function toGrid(cached: CachedGrid): DemGrid {
  return {
    zoom: cached.extent.zoom,
    tileX0: cached.extent.tileX0,
    tileY0: cached.extent.tileY0,
    tileSize: DEM_TILE_SIZE,
    width: cached.width,
    height: cached.height,
    data: cached.data,
  }
}

function runWorker(
  extent: DemExtent,
  onProgress?: (done: number, total: number) => void,
): Promise<CachedGrid> {
  return new Promise<CachedGrid>((resolve, reject) => {
    const worker = new Worker(new URL('./demWorker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (event: MessageEvent<DemResponse>) => {
      const message = event.data
      if (message.type === 'ilerleme') {
        onProgress?.(message.done, message.total)
        return
      }
      worker.terminate()
      if (message.type === 'hata') {
        reject(new Error(message.message))
        return
      }
      resolve({
        extent,
        width: message.width,
        height: message.height,
        data: new Float32Array(message.buffer),
      })
    }

    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'Yükselti worker hatası'))
    }

    const request: DemRequest = {
      zoom: extent.zoom,
      tileX0: extent.tileX0,
      tileY0: extent.tileY0,
      tilesX: extent.tilesX,
      tilesY: extent.tilesY,
      tileSize: DEM_TILE_SIZE,
      urlTemplate: SOURCES.demTerrarium,
    }
    worker.postMessage(request)
  })
}

let gridPromise: Promise<DemGrid> | null = null

export function loadDemGrid(onProgress?: (done: number, total: number) => void): Promise<DemGrid> {
  gridPromise ??= (async () => {
    const extent = demExtent()
    const version = cacheVersion(extent)
    const hit = await cacheGet<CachedGrid>('dem', version)
    if (hit) return toGrid(hit)

    const produced = await runWorker(extent, onProgress)
    await cacheSet('dem', version, produced, null)
    return toGrid(produced)
  })().catch((error: unknown) => {
    gridPromise = null
    throw error
  })

  return gridPromise
}

export function demTileCount(): number {
  const extent = demExtent()
  return extent.tilesX * extent.tilesY
}
