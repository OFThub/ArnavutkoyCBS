// Çekirdek ölçekleme işçisi: iki farklı yük çalıştırır — yalnız ALU kullanan hesap çekirdeği ve belleğe bağlı Horn eğim çekirdeği.

export type BenchKernel = 'alu' | 'bellek'

export interface BenchWorkerRequest {
  kernel: BenchKernel
  width: number
  height: number
  tekrar: number
}

export interface BenchWorkerResponse {
  sink: number
}

function buildSlice(width: number, height: number): Float32Array {
  const data = new Float32Array(width * height)
  for (let index = 0; index < data.length; index += 1) {
    data[index] = 100 + Math.sin(index / 53) * 40 + Math.cos(index / 31) * 25
  }
  return data
}

function aluKernel(iterations: number): number {
  let sink = 0
  for (let index = 1; index < iterations; index += 1) sink += Math.sqrt(index) * 1.0000001
  return sink
}

function slopeSlice(data: Float32Array, width: number, height: number): number {
  let sink = 0
  const at = (x: number, y: number): number => {
    const cx = x < 0 ? 0 : x >= width ? width - 1 : x
    const cy = y < 0 ? 0 : y >= height ? height - 1 : y
    return data[cy * width + cx] as number
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = at(x - 1, y - 1)
      const b = at(x, y - 1)
      const c = at(x + 1, y - 1)
      const d = at(x - 1, y)
      const f = at(x + 1, y)
      const g = at(x - 1, y + 1)
      const h = at(x, y + 1)
      const i = at(x + 1, y + 1)
      const dzdx = (c + 2 * f + i - (a + 2 * d + g)) / 8
      const dzdy = (g + 2 * h + i - (a + 2 * b + c)) / 8
      sink += Math.hypot(dzdx, dzdy)
    }
  }
  return sink
}

const ALU_ITERATIONS = 3_000_000

let cached: Float32Array | null = null
let cachedWidth = 0
let cachedHeight = 0

self.onmessage = (event: MessageEvent<BenchWorkerRequest>) => {
  const { kernel, width, height, tekrar } = event.data
  let sink = 0

  if (kernel === 'alu') {
    for (let round = 0; round < tekrar; round += 1) sink += aluKernel(ALU_ITERATIONS)
  } else {
    if (!cached || cachedWidth !== width || cachedHeight !== height) {
      cached = buildSlice(width, height)
      cachedWidth = width
      cachedHeight = height
    }
    for (let round = 0; round < tekrar; round += 1) sink += slopeSlice(cached, width, height)
  }

  const response: BenchWorkerResponse = { sink }
  self.postMessage(response)
}
