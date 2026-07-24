// Terrarium yükselti döşemelerinin çözümü, ızgara koordinat dönüşümleri ve eğim / bakı / TPI türetmeleri.

export const EARTH_CIRCUMFERENCE_M = 40075016.686

export interface DemGrid {
  zoom: number
  tileX0: number
  tileY0: number
  tileSize: number
  width: number
  height: number
  data: Float32Array
}

export function decodeTerrarium(red: number, green: number, blue: number): number {
  return red * 256 + green + blue / 256 - 32768
}

export function lngToTileX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * 2 ** zoom
}

export function latToTileY(lat: number, zoom: number): number {
  const radians = (lat * Math.PI) / 180
  const merc = Math.log(Math.tan(radians) + 1 / Math.cos(radians))
  return ((1 - merc / Math.PI) / 2) * 2 ** zoom
}

export function tileXToLng(x: number, zoom: number): number {
  return (x / 2 ** zoom) * 360 - 180
}

export function tileYToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** zoom
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

export function gridToLngLat(grid: DemGrid, px: number, py: number): [number, number] {
  const tileX = grid.tileX0 + px / grid.tileSize
  const tileY = grid.tileY0 + py / grid.tileSize
  return [tileXToLng(tileX, grid.zoom), tileYToLat(tileY, grid.zoom)]
}

export function lngLatToGrid(grid: DemGrid, lng: number, lat: number): [number, number] {
  const px = (lngToTileX(lng, grid.zoom) - grid.tileX0) * grid.tileSize
  const py = (latToTileY(lat, grid.zoom) - grid.tileY0) * grid.tileSize
  return [px, py]
}

export function gridBounds(grid: DemGrid): [number, number, number, number] {
  const [west, north] = gridToLngLat(grid, 0, 0)
  const [east, south] = gridToLngLat(grid, grid.width, grid.height)
  return [west, south, east, north]
}

export function valueAt(grid: DemGrid, x: number, y: number): number {
  const cx = Math.min(grid.width - 1, Math.max(0, x))
  const cy = Math.min(grid.height - 1, Math.max(0, y))
  return grid.data[cy * grid.width + cx] ?? Number.NaN
}

export function elevationAt(grid: DemGrid, lng: number, lat: number): number {
  const [px, py] = lngLatToGrid(grid, lng, lat)
  if (px < 0 || py < 0 || px > grid.width - 1 || py > grid.height - 1) return Number.NaN

  const x0 = Math.floor(px)
  const y0 = Math.floor(py)
  const fx = px - x0
  const fy = py - y0

  const topLeft = valueAt(grid, x0, y0)
  const topRight = valueAt(grid, x0 + 1, y0)
  const bottomLeft = valueAt(grid, x0, y0 + 1)
  const bottomRight = valueAt(grid, x0 + 1, y0 + 1)

  const top = topLeft + (topRight - topLeft) * fx
  const bottom = bottomLeft + (bottomRight - bottomLeft) * fx
  return top + (bottom - top) * fy
}

export function cellSizeMeters(grid: DemGrid, py: number): number {
  const lat = tileYToLat(grid.tileY0 + py / grid.tileSize, grid.zoom)
  return (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / (grid.tileSize * 2 ** grid.zoom)
}

export interface SlopeAspect {
  slopePercent: number
  slopeDegrees: number
  aspectDegrees: number
}

export function slopeAspectAt(grid: DemGrid, x: number, y: number): SlopeAspect {
  const a = valueAt(grid, x - 1, y - 1)
  const b = valueAt(grid, x, y - 1)
  const c = valueAt(grid, x + 1, y - 1)
  const d = valueAt(grid, x - 1, y)
  const f = valueAt(grid, x + 1, y)
  const g = valueAt(grid, x - 1, y + 1)
  const h = valueAt(grid, x, y + 1)
  const i = valueAt(grid, x + 1, y + 1)

  const cell = cellSizeMeters(grid, y)
  const dzdx = (c + 2 * f + i - (a + 2 * d + g)) / (8 * cell)
  const dzdy = (g + 2 * h + i - (a + 2 * b + c)) / (8 * cell)

  const slopeDegrees = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI
  const slopePercent = Math.hypot(dzdx, dzdy) * 100

  let aspectDegrees = -1
  if (dzdx !== 0 || dzdy !== 0) {
    const raw = (Math.atan2(dzdy, -dzdx) * 180) / Math.PI
    aspectDegrees = raw < 0 ? 90 - raw : raw > 90 ? 450 - raw : 90 - raw
  }

  return { slopePercent, slopeDegrees, aspectDegrees }
}

export type SlopeClass = 'duz' | 'hafif' | 'orta' | 'dik' | 'cok-dik'

export const SLOPE_CLASSES: { id: SlopeClass; label: string; max: number; color: string }[] = [
  { id: 'duz', label: 'Düz (%0-2)', max: 2, color: '#1a9850' },
  { id: 'hafif', label: 'Hafif (%2-6)', max: 6, color: '#a6d96a' },
  { id: 'orta', label: 'Orta (%6-12)', max: 12, color: '#fee08b' },
  { id: 'dik', label: 'Dik (%12-20)', max: 20, color: '#f46d43' },
  { id: 'cok-dik', label: 'Çok dik (>%20)', max: Number.POSITIVE_INFINITY, color: '#a50026' },
]

export function classifySlope(percent: number): SlopeClass {
  for (const item of SLOPE_CLASSES) {
    if (percent < item.max) return item.id
  }
  return 'cok-dik'
}

export const ASPECT_SECTORS = [
  { label: 'Kuzey', color: '#2b83ba' },
  { label: 'Kuzeydoğu', color: '#4fa3b8' },
  { label: 'Doğu', color: '#80c4a5' },
  { label: 'Güneydoğu', color: '#b8e186' },
  { label: 'Güney', color: '#fdae61' },
  { label: 'Güneybatı', color: '#f46d43' },
  { label: 'Batı', color: '#d73027' },
  { label: 'Kuzeybatı', color: '#8c6bb1' },
]

export function aspectSector(degrees: number): number {
  if (degrees < 0) return -1
  return Math.round(degrees / 45) % 8
}

export function tpiAt(grid: DemGrid, x: number, y: number, radius: number): number {
  let total = 0
  let count = 0
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue
      total += valueAt(grid, x + dx, y + dy)
      count += 1
    }
  }
  if (count === 0) return 0
  return valueAt(grid, x, y) - total / count
}

export type TerrainClass = 'vadi' | 'yamac' | 'duzluk' | 'sirt'

export const TERRAIN_CLASSES: Record<TerrainClass, { label: string; color: string }> = {
  vadi: { label: 'Vadi / çukur', color: '#2166ac' },
  yamac: { label: 'Yamaç', color: '#92c5de' },
  duzluk: { label: 'Düzlük', color: '#f7f7f7' },
  sirt: { label: 'Tepe / sırt', color: '#b2182b' },
}

export function classifyTerrain(
  tpi: number,
  standardDeviation: number,
  slopeDegrees: number,
): TerrainClass {
  const threshold = standardDeviation > 0 ? standardDeviation : 1
  if (tpi <= -threshold) return 'vadi'
  if (tpi >= threshold) return 'sirt'
  return slopeDegrees <= 5 ? 'duzluk' : 'yamac'
}

export interface GridStats {
  min: number
  max: number
  mean: number
}

export function gridStats(data: Float32Array): GridStats {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  let total = 0
  for (let index = 0; index < data.length; index += 1) {
    const value = data[index] ?? 0
    if (value < min) min = value
    if (value > max) max = value
    total += value
  }
  return { min, max, mean: data.length > 0 ? total / data.length : 0 }
}

export function standardDeviation(values: Float32Array): number {
  if (values.length === 0) return 0
  let total = 0
  for (let index = 0; index < values.length; index += 1) total += values[index] ?? 0
  const mean = total / values.length
  let variance = 0
  for (let index = 0; index < values.length; index += 1) {
    const delta = (values[index] ?? 0) - mean
    variance += delta * delta
  }
  return Math.sqrt(variance / values.length)
}

export function tpiGrid(grid: DemGrid, radius: number): Float32Array {
  const { width, height, data } = grid
  const stride = width + 1
  const sat = new Float64Array(stride * (height + 1))

  for (let y = 0; y < height; y += 1) {
    let rowSum = 0
    for (let x = 0; x < width; x += 1) {
      rowSum += data[y * width + x] ?? 0
      sat[(y + 1) * stride + (x + 1)] = (sat[y * stride + (x + 1)] ?? 0) + rowSum
    }
  }

  const out = new Float32Array(width * height)
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.max(0, y - radius)
    const y1 = Math.min(height - 1, y + radius)
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(width - 1, x + radius)
      const sum =
        (sat[(y1 + 1) * stride + (x1 + 1)] ?? 0) -
        (sat[y0 * stride + (x1 + 1)] ?? 0) -
        (sat[(y1 + 1) * stride + x0] ?? 0) +
        (sat[y0 * stride + x0] ?? 0)
      const count = (y1 - y0 + 1) * (x1 - x0 + 1)
      const center = data[y * width + x] ?? 0
      out[y * width + x] = count > 1 ? center - (sum - center) / (count - 1) : 0
    }
  }
  return out
}

export interface SlopeAspectGrids {
  slopePercent: Float32Array
  slopeDegrees: Float32Array
  aspect: Float32Array
}

export function slopeAspectGrid(grid: DemGrid): SlopeAspectGrids {
  const { width, height } = grid
  const slopePercent = new Float32Array(width * height)
  const slopeDegrees = new Float32Array(width * height)
  const aspect = new Float32Array(width * height)

  for (let y = 0; y < height; y += 1) {
    const cell = cellSizeMeters(grid, y)
    for (let x = 0; x < width; x += 1) {
      const a = valueAt(grid, x - 1, y - 1)
      const b = valueAt(grid, x, y - 1)
      const c = valueAt(grid, x + 1, y - 1)
      const d = valueAt(grid, x - 1, y)
      const f = valueAt(grid, x + 1, y)
      const g = valueAt(grid, x - 1, y + 1)
      const h = valueAt(grid, x, y + 1)
      const i = valueAt(grid, x + 1, y + 1)

      const dzdx = (c + 2 * f + i - (a + 2 * d + g)) / (8 * cell)
      const dzdy = (g + 2 * h + i - (a + 2 * b + c)) / (8 * cell)
      const rise = Math.hypot(dzdx, dzdy)
      const index = y * width + x

      slopePercent[index] = rise * 100
      slopeDegrees[index] = (Math.atan(rise) * 180) / Math.PI
      if (dzdx === 0 && dzdy === 0) {
        aspect[index] = -1
      } else {
        const raw = (Math.atan2(dzdy, -dzdx) * 180) / Math.PI
        aspect[index] = raw < 0 ? 90 - raw : raw > 90 ? 450 - raw : 90 - raw
      }
    }
  }

  return { slopePercent, slopeDegrees, aspect }
}
