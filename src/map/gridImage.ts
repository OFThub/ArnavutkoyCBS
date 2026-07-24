// Türetilmiş ızgara değerlerini renk paletiyle tuvale basıp MapLibre görüntü kaynağı olarak haritaya ekler.

import type { Map as MapLibreMap } from 'maplibre-gl'
import { gridBounds, type DemGrid } from '../core/terrain'
import { upsertLayer } from './overlays'

export type Rgba = readonly [number, number, number, number]
export type PixelPainter = (index: number) => Rgba | null

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

export function rampColor(
  stops: { at: number; color: string }[],
  ratio: number,
): [number, number, number] {
  const clamped = Math.min(1, Math.max(0, ratio))
  let lower = stops[0]
  let upper = stops[stops.length - 1]
  if (!lower || !upper) return [0, 0, 0]

  for (let index = 0; index < stops.length - 1; index += 1) {
    const current = stops[index]
    const next = stops[index + 1]
    if (current && next && clamped >= current.at && clamped <= next.at) {
      lower = current
      upper = next
      break
    }
  }

  const span = upper.at - lower.at
  const local = span > 0 ? (clamped - lower.at) / span : 0
  const from = hexToRgb(lower.color)
  const to = hexToRgb(upper.color)
  return [
    Math.round(from[0] + (to[0] - from[0]) * local),
    Math.round(from[1] + (to[1] - from[1]) * local),
    Math.round(from[2] + (to[2] - from[2]) * local),
  ]
}

export function paintGrid(grid: DemGrid, paint: PixelPainter): ImageData {
  const image = new ImageData(grid.width, grid.height)
  const pixels = image.data
  for (let index = 0; index < grid.width * grid.height; index += 1) {
    const color = paint(index)
    const target = index * 4
    if (!color) {
      pixels[target + 3] = 0
      continue
    }
    pixels[target] = color[0]
    pixels[target + 1] = color[1]
    pixels[target + 2] = color[2]
    pixels[target + 3] = color[3]
  }
  return image
}

export function gridImageUrl(grid: DemGrid, paint: PixelPainter): string {
  const canvas = document.createElement('canvas')
  canvas.width = grid.width
  canvas.height = grid.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Izgara görüntüsü için 2B bağlam alınamadı')
  context.putImageData(paintGrid(grid, paint), 0, 0)
  return canvas.toDataURL('image/png')
}

export function gridCoordinates(
  grid: DemGrid,
): [[number, number], [number, number], [number, number], [number, number]] {
  const [west, south, east, north] = gridBounds(grid)
  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ]
}

export function upsertGridImage(
  map: MapLibreMap,
  id: string,
  grid: DemGrid,
  url: string,
  opacity: number,
): void {
  if (!map.getSource(id)) {
    map.addSource(id, { type: 'image', url, coordinates: gridCoordinates(grid) })
  }
  upsertLayer(map, {
    id: `${id}-goruntu`,
    type: 'raster',
    source: id,
    paint: { 'raster-opacity': opacity, 'raster-resampling': 'nearest', 'raster-fade-duration': 0 },
  })
}
