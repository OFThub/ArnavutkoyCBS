// Terrarium çözümleme, ızgara dönüşümleri, Horn eğimi, bakı, TPI, kontur ve yükselti profilinin testleri.

import { describe, expect, it } from 'vitest'
import { contourLines, contourThresholds, downsampleGrid } from './contour'
import { niceScaleBar } from './format'
import { elevationProfile } from './profile'
import {
  aspectSector,
  cellSizeMeters,
  classifySlope,
  classifyTerrain,
  decodeTerrarium,
  elevationAt,
  gridToLngLat,
  latToTileY,
  lngLatToGrid,
  lngToTileX,
  slopeAspectAt,
  slopeAspectGrid,
  standardDeviation,
  tileXToLng,
  tileYToLat,
  tpiAt,
  tpiGrid,
  type DemGrid,
} from './terrain'

function makeGrid(width: number, height: number, fill: (x: number, y: number) => number): DemGrid {
  const data = new Float32Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) data[y * width + x] = fill(x, y)
  }
  return { zoom: 12, tileX0: 2371, tileY0: 1529, tileSize: 256, width, height, data }
}

describe('terrarium çözümleme', () => {
  it('referans formülü uygular', () => {
    expect(decodeTerrarium(128, 0, 0)).toBe(0)
    expect(decodeTerrarium(128, 160, 0)).toBe(160)
    expect(decodeTerrarium(127, 255, 255)).toBeCloseTo(-0.00390625, 8)
    expect(decodeTerrarium(129, 0, 0)).toBe(256)
  })

  it('deniz seviyesi altını negatif verir', () => {
    expect(decodeTerrarium(127, 246, 0)).toBe(-10)
  })
})

describe('döşeme koordinat dönüşümleri', () => {
  it('boylam ve enlem tur atar', () => {
    const zoom = 12
    expect(tileXToLng(lngToTileX(28.6554, zoom), zoom)).toBeCloseTo(28.6554, 9)
    expect(tileYToLat(latToTileY(41.2484, zoom), zoom)).toBeCloseTo(41.2484, 9)
  })

  it('ızgara piksel dönüşümü tur atar', () => {
    const grid = makeGrid(64, 64, () => 0)
    const [lng, lat] = gridToLngLat(grid, 20, 30)
    const [px, py] = lngLatToGrid(grid, lng, lat)
    expect(px).toBeCloseTo(20, 6)
    expect(py).toBeCloseTo(30, 6)
  })

  it('hücre boyutu planın öngördüğü çözünürlüğü verir', () => {
    const grid = makeGrid(8, 8, () => 0)
    expect(cellSizeMeters(grid, 0)).toBeGreaterThan(28)
    expect(cellSizeMeters(grid, 0)).toBeLessThan(30)
  })
})

describe('yükselti örnekleme', () => {
  it('iki yönlü doğrusal ara değer üretir', () => {
    const grid = makeGrid(4, 4, (x) => x * 10)
    const [lng, lat] = gridToLngLat(grid, 1.5, 1)
    expect(elevationAt(grid, lng, lat)).toBeCloseTo(15, 4)
  })

  it('ızgara dışında NaN döner', () => {
    const grid = makeGrid(4, 4, () => 100)
    expect(Number.isNaN(elevationAt(grid, 0, 0))).toBe(true)
  })
})

describe('Horn eğimi ve bakı', () => {
  const step = 10
  const grid = makeGrid(9, 9, (x) => x * step)
  const cell = cellSizeMeters(grid, 4)

  it('doğuya yükselen düzlemde eğimi doğru hesaplar', () => {
    const { slopePercent, slopeDegrees } = slopeAspectAt(grid, 4, 4)
    expect(slopePercent).toBeCloseTo((step / cell) * 100, 6)
    expect(slopeDegrees).toBeCloseTo((Math.atan(step / cell) * 180) / Math.PI, 6)
  })

  it('doğuya yükselen düzlemde bakı batıyı gösterir', () => {
    expect(slopeAspectAt(grid, 4, 4).aspectDegrees).toBeCloseTo(270, 6)
    expect(aspectSector(270)).toBe(6)
  })

  it('kuzeye yükselen düzlemde bakı güneyi gösterir', () => {
    const northward = makeGrid(9, 9, (_x, y) => (8 - y) * step)
    expect(slopeAspectAt(northward, 4, 4).aspectDegrees).toBeCloseTo(180, 6)
  })

  it('düz arazide eğim sıfır, bakı tanımsızdır', () => {
    const flat = makeGrid(5, 5, () => 42)
    const result = slopeAspectAt(flat, 2, 2)
    expect(result.slopePercent).toBe(0)
    expect(result.aspectDegrees).toBe(-1)
  })

  it('toplu hesap nokta hesabıyla birebir uyuşur', () => {
    const bulk = slopeAspectGrid(grid)
    for (const [x, y] of [
      [1, 1],
      [4, 4],
      [7, 3],
      [0, 8],
    ]) {
      const point = slopeAspectAt(grid, x!, y!)
      const index = y! * grid.width + x!
      expect(bulk.slopePercent[index]).toBeCloseTo(point.slopePercent, 4)
      expect(bulk.slopeDegrees[index]).toBeCloseTo(point.slopeDegrees, 4)
      expect(bulk.aspect[index]).toBeCloseTo(point.aspectDegrees, 4)
    }
  })

  it('eğim sınıfları plandaki eşiklere uyar', () => {
    expect(classifySlope(0)).toBe('duz')
    expect(classifySlope(1.9)).toBe('duz')
    expect(classifySlope(2)).toBe('hafif')
    expect(classifySlope(5.9)).toBe('hafif')
    expect(classifySlope(6)).toBe('orta')
    expect(classifySlope(12)).toBe('dik')
    expect(classifySlope(20)).toBe('cok-dik')
    expect(classifySlope(80)).toBe('cok-dik')
  })
})

describe('TPI ve topografik konum', () => {
  it('tepede pozitif, çukurda negatif değer verir', () => {
    const peak = makeGrid(9, 9, (x, y) => (x === 4 && y === 4 ? 100 : 0))
    const pit = makeGrid(9, 9, (x, y) => (x === 4 && y === 4 ? -100 : 0))
    expect(tpiAt(peak, 4, 4, 2)).toBeGreaterThan(0)
    expect(tpiAt(pit, 4, 4, 2)).toBeLessThan(0)
  })

  it('düzlükte sıfırdır', () => {
    const flat = makeGrid(9, 9, () => 55)
    expect(tpiAt(flat, 4, 4, 2)).toBeCloseTo(0, 6)
  })

  it('toplam alan tablosu doğrudan hesapla uyuşur', () => {
    const grid = makeGrid(16, 16, (x, y) => Math.sin(x / 3) * 40 + Math.cos(y / 4) * 25)
    const bulk = tpiGrid(grid, 3)
    for (const [x, y] of [
      [5, 5],
      [8, 11],
      [12, 4],
    ]) {
      expect(bulk[y! * grid.width + x!]).toBeCloseTo(tpiAt(grid, x!, y!, 3), 3)
    }
  })

  it('sınıflandırma standart sapma eşiğini kullanır', () => {
    expect(classifyTerrain(-5, 2, 12)).toBe('vadi')
    expect(classifyTerrain(5, 2, 12)).toBe('sirt')
    expect(classifyTerrain(0.5, 2, 12)).toBe('yamac')
    expect(classifyTerrain(0.5, 2, 3)).toBe('duzluk')
  })

  it('standart sapma bilinen diziyi doğru verir', () => {
    expect(standardDeviation(new Float32Array([2, 4, 4, 4, 5, 5, 7, 9]))).toBeCloseTo(2, 6)
  })
})

describe('eşyükselti eğrileri', () => {
  it('eşik listesini aralığa göre üretir', () => {
    expect(contourThresholds(3, 32, 10)).toEqual([10, 20, 30])
    expect(contourThresholds(0, 0, 10)).toEqual([])
    expect(contourThresholds(10, 50, 0)).toEqual([])
  })

  it('seyreltme ızgarayı küçültür ve değer korur', () => {
    const grid = makeGrid(8, 8, (x) => x)
    const small = downsampleGrid(grid, 2)
    expect(small.width).toBe(4)
    expect(small.height).toBe(4)
    expect(small.data[0]).toBe(0)
    expect(small.data[1]).toBe(2)
  })

  it('koni yüzeyinde beklenen kotlarda kapalı eğri üretir', () => {
    const size = 40
    const cone = makeGrid(size, size, (x, y) => {
      const dx = x - size / 2
      const dy = y - size / 2
      return Math.max(0, 100 - Math.hypot(dx, dy) * 5)
    })
    const result = contourLines(cone, { interval: 20, downsample: 1, minVertices: 4 })
    const levels = [...new Set(result.features.map((f) => Number(f.properties?.['yukselti'])))].sort(
      (a, b) => a - b,
    )

    expect(levels).toEqual([0, 20, 40, 60, 80])
    expect(levels.every((level) => level % 20 === 0)).toBe(true)

    for (const feature of result.features) {
      const ring = feature.geometry.coordinates
      expect(ring.length).toBeGreaterThan(3)
      expect(ring[0]).toEqual(ring[ring.length - 1])
    }
  })

  it('zirve tek hücreye düştüğünde eğri üretmez', () => {
    const size = 40
    const cone = makeGrid(size, size, (x, y) =>
      Math.max(0, 100 - Math.hypot(x - size / 2, y - size / 2) * 5),
    )
    const result = contourLines(cone, { interval: 20, downsample: 1, minVertices: 4 })
    expect(result.features.some((f) => Number(f.properties?.['yukselti']) === 100)).toBe(false)
  })
})

describe('yükselti profili', () => {
  it('doğuya yükselen düzlemde tırmanışı toplar, inişi sıfır bırakır', () => {
    const grid = makeGrid(64, 64, (x) => x * 5)
    const [startLng, startLat] = gridToLngLat(grid, 4, 32)
    const [endLng, endLat] = gridToLngLat(grid, 44, 32)

    const result = elevationProfile(
      grid,
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [startLng, startLat],
            [endLng, endLat],
          ],
        },
      },
      50,
    )

    expect(result.samples.length).toBe(50)
    expect(result.minElevation).toBeCloseTo(20, 1)
    expect(result.maxElevation).toBeCloseTo(220, 1)
    expect(result.ascent).toBeCloseTo(200, 0)
    expect(result.descent).toBeCloseTo(0, 6)
    expect(result.totalMeters).toBeGreaterThan(0)
  })
})

describe('yazdırma ölçek çubuğu', () => {
  it('yuvarlak 1-2-5 değerlerini seçer', () => {
    expect(niceScaleBar(10, 45).meters).toBe(200)
    expect(niceScaleBar(1, 45).meters).toBe(20)
    expect(niceScaleBar(2.5, 45).meters).toBe(100)
    expect(niceScaleBar(0, 45)).toEqual({ meters: 0, millimeters: 0 })
  })

  it('çubuk uzunluğu seçilen mesafeyle tutarlıdır', () => {
    const bar = niceScaleBar(10, 45)
    expect(bar.millimeters).toBeCloseTo(bar.meters / 10, 9)
  })
})
