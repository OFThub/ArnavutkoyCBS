// Başarım testinin ölçtüğü gerçek iş yükleri: uygulamanın kendi topografya, kontur, bellek ve depolama işlemleri.

import { contourLines } from '../core/contour'
import { cacheDelete, cacheGet, cacheSet } from '../core/storage'
import {
  decodeTerrarium,
  gridStats,
  slopeAspectGrid,
  standardDeviation,
  tpiGrid,
  type DemGrid,
} from '../core/terrain'
import { summarize, throughput, type Timing } from './stats'

export const BENCH_WIDTH = 1024
export const BENCH_HEIGHT = 1536
export const BENCH_CELLS = BENCH_WIDTH * BENCH_HEIGHT

export type WorkloadUnit = 'hucre' | 'piksel' | 'bayt'

export interface Workload {
  id: string
  baslik: string
  altSistem: 'CPU' | 'Bellek' | 'Depolama'
  aciklama: string
  birim: WorkloadUnit
  miktar: number
  tekrar: number
  run: () => void | Promise<void>
}

export interface WorkloadResult {
  id: string
  baslik: string
  altSistem: string
  birim: WorkloadUnit
  miktar: number
  zaman: Timing
  verim: number
}

export function syntheticGrid(width = BENCH_WIDTH, height = BENCH_HEIGHT): DemGrid {
  const data = new Float32Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data[y * width + x] =
        120 + Math.sin(x / 37) * 60 + Math.cos(y / 29) * 55 + Math.sin((x + y) / 17) * 20
    }
  }
  return { zoom: 12, tileX0: 2372, tileY0: 1529, tileSize: 256, width, height, data }
}

function syntheticTilePixels(size: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(size * size * 4)
  for (let index = 0; index < size * size; index += 1) {
    const target = index * 4
    pixels[target] = 128 + (index % 3)
    pixels[target + 1] = index % 256
    pixels[target + 2] = (index * 7) % 256
    pixels[target + 3] = 255
  }
  return pixels
}

export function buildWorkloads(grid: DemGrid): Workload[] {
  const tile = syntheticTilePixels(256)
  const tilePixels = 256 * 256 * 24
  const bandwidthCells = 16 * 1024 * 1024
  const bandwidthBuffer = new Float32Array(bandwidthCells)
  const storageBytes = grid.data.byteLength

  return [
    {
      id: 'terrarium',
      baslik: 'Terrarium çözme',
      altSistem: 'CPU',
      aciklama: '24 döşemelik yükselti PNG verisinin metreye çevrilmesi',
      birim: 'piksel',
      miktar: tilePixels,
      tekrar: 5,
      run: () => {
        let sink = 0
        for (let repeat = 0; repeat < 24; repeat += 1) {
          for (let index = 0; index < tile.length; index += 4) {
            sink += decodeTerrarium(
              tile[index] as number,
              tile[index + 1] as number,
              tile[index + 2] as number,
            )
          }
        }
        if (!Number.isFinite(sink)) throw new Error('terrarium çözme başarısız')
      },
    },
    {
      id: 'egim',
      baslik: 'Eğim + bakı (Horn 3×3)',
      altSistem: 'CPU',
      aciklama: 'Sekiz komşulu konvolüsyon çekirdeği, tüm ızgara',
      birim: 'hucre',
      miktar: grid.width * grid.height,
      tekrar: 5,
      run: () => {
        slopeAspectGrid(grid)
      },
    },
    {
      id: 'tpi',
      baslik: 'TPI (toplam alan tablosu)',
      altSistem: 'CPU',
      aciklama: 'r=5 pencereli topografik konum indeksi',
      birim: 'hucre',
      miktar: grid.width * grid.height,
      tekrar: 5,
      run: () => {
        tpiGrid(grid, 5)
      },
    },
    {
      id: 'istatistik',
      baslik: 'Izgara istatistiği',
      altSistem: 'CPU',
      aciklama: 'Min/maks/ortalama ve standart sapma taraması',
      birim: 'hucre',
      miktar: grid.width * grid.height * 2,
      tekrar: 5,
      run: () => {
        gridStats(grid.data)
        standardDeviation(grid.data)
      },
    },
    {
      id: 'kontur',
      baslik: 'Eşyükselti (marching squares)',
      altSistem: 'CPU',
      aciklama: '10 m aralıkla eğri çıkarma, seyreltme 4',
      birim: 'hucre',
      miktar: (grid.width / 4) * (grid.height / 4),
      tekrar: 3,
      run: () => {
        contourLines(grid, { interval: 10, downsample: 4 })
      },
    },
    {
      id: 'bellek',
      baslik: 'Bellek bant genişliği',
      altSistem: 'Bellek',
      aciklama: '64 MB Float32Array ardışık yazma + okuma',
      birim: 'bayt',
      miktar: bandwidthBuffer.byteLength * 2,
      tekrar: 5,
      run: () => {
        for (let index = 0; index < bandwidthCells; index += 1) bandwidthBuffer[index] = index
        let sink = 0
        for (let index = 0; index < bandwidthCells; index += 1) sink += bandwidthBuffer[index] as number
        if (!Number.isFinite(sink)) throw new Error('bellek taraması başarısız')
      },
    },
    {
      id: 'depolama',
      baslik: 'IndexedDB yaz + oku',
      altSistem: 'Depolama',
      aciklama: `${(storageBytes / (1024 * 1024)).toFixed(1)} MB ızgara kalıcı önbelleğe yazılıp okunur`,
      birim: 'bayt',
      miktar: storageBytes * 2,
      tekrar: 3,
      run: async () => {
        await cacheSet('bench-depolama', 'v1', grid.data, null)
        const back = await cacheGet<Float32Array>('bench-depolama', 'v1')
        if (!back || back.length !== grid.data.length) throw new Error('depolama turu başarısız')
      },
    },
  ]
}

export async function runWorkload(workload: Workload): Promise<WorkloadResult> {
  await workload.run()

  const samples: number[] = []
  for (let repeat = 0; repeat < workload.tekrar; repeat += 1) {
    const started = performance.now()
    await workload.run()
    samples.push(performance.now() - started)
  }

  const zaman = summarize(samples)
  return {
    id: workload.id,
    baslik: workload.baslik,
    altSistem: workload.altSistem,
    birim: workload.birim,
    miktar: workload.miktar,
    zaman,
    verim: throughput(workload.miktar, zaman.medyanMs),
  }
}

export async function cleanupWorkloads(): Promise<void> {
  await cacheDelete('bench-depolama')
}
