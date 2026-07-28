// PWA ikonlarını bağımlılıksız üretir: teal zemin üzerine beyaz harita iğnesi, ham PNG olarak kodlanır.

import { deflateSync } from 'node:zlib'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const OUT_DIR = resolve(import.meta.dirname, '../public/icons')
const BACKGROUND: [number, number, number] = [13, 148, 136]
const FOREGROUND: [number, number, number] = [255, 255, 255]

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer: Buffer): number {
  let crc = -1
  for (const byte of buffer) crc = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

function encodePng(size: number, pixels: Uint8Array): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0

  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function insideTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNegative && hasPositive)
}

function renderIcon(size: number): Uint8Array {
  const pixels = new Uint8Array(size * size * 4)

  const centerX = size / 2
  const headY = size * 0.42
  const headRadius = size * 0.17
  const holeRadius = headRadius * 0.42
  const tipY = size * 0.73
  const shoulder = headRadius * 0.86
  const shoulderY = headY + headRadius * 0.46

  const samples = 3
  const offset = 1 / (samples * 2)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let covered = 0
      let hole = 0

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + offset + (sx / samples)
          const py = y + offset + (sy / samples)
          const dx = px - centerX
          const dy = py - headY
          const inHead = dx * dx + dy * dy <= headRadius * headRadius
          const inBody = insideTriangle(
            px,
            py,
            centerX - shoulder,
            shoulderY,
            centerX + shoulder,
            shoulderY,
            centerX,
            tipY,
          )
          if (inHead || inBody) covered += 1
          if (dx * dx + dy * dy <= holeRadius * holeRadius) hole += 1
        }
      }

      const total = samples * samples
      const pinAlpha = covered / total
      const holeAlpha = hole / total
      const mix = Math.max(0, pinAlpha - holeAlpha)

      const index = (y * size + x) * 4
      for (let channel = 0; channel < 3; channel += 1) {
        const back = BACKGROUND[channel] as number
        const fore = FOREGROUND[channel] as number
        pixels[index + channel] = Math.round(back + (fore - back) * mix)
      }
      pixels[index + 3] = 255
    }
  }

  return pixels
}

async function run(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true })
  for (const size of [180, 192, 512]) {
    const file = resolve(OUT_DIR, `icon-${size}.png`)
    const png = encodePng(size, renderIcon(size))
    await writeFile(file, png)
    console.log(`icon-${size}.png · ${png.length} bayt`)
  }
}

await run()
