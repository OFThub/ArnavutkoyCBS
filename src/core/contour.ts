// Yükselti ızgarasından marching squares ile eşyükselti eğrilerini üretip coğrafi koordinata çevirir.

import { contours } from 'd3-contour'
import type { Feature, FeatureCollection, LineString } from 'geojson'
import { gridToLngLat, type DemGrid } from './terrain'

export interface ContourOptions {
  interval: number
  downsample?: number
  minVertices?: number
}

export function contourThresholds(min: number, max: number, interval: number): number[] {
  if (!(interval > 0) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return []
  const first = Math.ceil(min / interval) * interval
  const list: number[] = []
  for (let value = first; value <= max; value += interval) {
    list.push(Number(value.toFixed(6)))
    if (list.length > 500) break
  }
  return list
}

export function downsampleGrid(grid: DemGrid, factor: number): DemGrid {
  if (factor <= 1) return grid
  const width = Math.floor(grid.width / factor)
  const height = Math.floor(grid.height / factor)
  const data = new Float32Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data[y * width + x] = grid.data[y * factor * grid.width + x * factor] ?? 0
    }
  }
  return { ...grid, width, height, data, tileSize: grid.tileSize / factor }
}

export function contourLines(grid: DemGrid, options: ContourOptions): FeatureCollection<LineString> {
  const factor = options.downsample ?? 4
  const minVertices = options.minVertices ?? 12
  const source = downsampleGrid(grid, factor)

  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (let index = 0; index < source.data.length; index += 1) {
    const value = source.data[index] ?? 0
    if (value < min) min = value
    if (value > max) max = value
  }

  const thresholds = contourThresholds(min, max, options.interval)
  if (thresholds.length === 0) return { type: 'FeatureCollection', features: [] }

  const generator = contours().size([source.width, source.height]).thresholds(thresholds)
  const values = source.data as unknown as number[]
  const features: Feature<LineString>[] = []

  for (const band of generator(values)) {
    for (const ring of band.coordinates.flat()) {
      if (ring.length < minVertices) continue
      features.push({
        type: 'Feature',
        properties: { yukselti: band.value },
        geometry: {
          type: 'LineString',
          coordinates: ring.map(([x, y]) => gridToLngLat(source, x ?? 0, y ?? 0)),
        },
      })
    }
  }

  return { type: 'FeatureCollection', features }
}
