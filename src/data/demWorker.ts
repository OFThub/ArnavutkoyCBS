// Terrarium döşemelerini indirip çözerek ilçe için tek bir Float32 yükselti ızgarası üreten Web Worker.

import { decodeTerrarium } from '../core/terrain'

export interface DemRequest {
  zoom: number
  tileX0: number
  tileY0: number
  tilesX: number
  tilesY: number
  tileSize: number
  urlTemplate: string
}

export type DemResponse =
  | { type: 'ilerleme'; done: number; total: number }
  | { type: 'bitti'; width: number; height: number; buffer: ArrayBuffer }
  | { type: 'hata'; message: string }

const CONCURRENCY = 6

function tileUrl(template: string, zoom: number, x: number, y: number): string {
  return template
    .replace('{z}', String(zoom))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
}

async function readTile(url: string, size: number): Promise<Uint8ClampedArray> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Yükselti döşemesi alınamadı (${response.status}): ${url}`)
  const bitmap = await createImageBitmap(await response.blob())
  const canvas = new OffscreenCanvas(size, size)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Yükselti döşemesi çözülemedi: 2B bağlam yok')
  context.drawImage(bitmap, 0, 0, size, size)
  bitmap.close()
  return context.getImageData(0, 0, size, size).data
}

async function build(request: DemRequest): Promise<{ width: number; height: number; data: Float32Array }> {
  const { zoom, tileX0, tileY0, tilesX, tilesY, tileSize, urlTemplate } = request
  const width = tilesX * tileSize
  const height = tilesY * tileSize
  const data = new Float32Array(width * height)

  const jobs: { tx: number; ty: number }[] = []
  for (let ty = 0; ty < tilesY; ty += 1) {
    for (let tx = 0; tx < tilesX; tx += 1) jobs.push({ tx, ty })
  }

  let done = 0
  let next = 0

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next
      next += 1
      const job = jobs[index]
      if (!job) return

      const pixels = await readTile(
        tileUrl(urlTemplate, zoom, tileX0 + job.tx, tileY0 + job.ty),
        tileSize,
      )

      const offsetX = job.tx * tileSize
      const offsetY = job.ty * tileSize
      for (let y = 0; y < tileSize; y += 1) {
        const rowStart = (offsetY + y) * width + offsetX
        for (let x = 0; x < tileSize; x += 1) {
          const source = (y * tileSize + x) * 4
          data[rowStart + x] = decodeTerrarium(
            pixels[source] ?? 0,
            pixels[source + 1] ?? 0,
            pixels[source + 2] ?? 0,
          )
        }
      }

      done += 1
      const message: DemResponse = { type: 'ilerleme', done, total: jobs.length }
      self.postMessage(message)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker))
  return { width, height, data }
}

self.onmessage = (event: MessageEvent<DemRequest>) => {
  build(event.data)
    .then(({ width, height, data }) => {
      const message: DemResponse = { type: 'bitti', width, height, buffer: data.buffer as ArrayBuffer }
      self.postMessage(message, [data.buffer as ArrayBuffer])
    })
    .catch((error: unknown) => {
      const message: DemResponse = {
        type: 'hata',
        message: error instanceof Error ? error.message : 'Yükselti ızgarası üretilemedi',
      }
      self.postMessage(message)
    })
}
