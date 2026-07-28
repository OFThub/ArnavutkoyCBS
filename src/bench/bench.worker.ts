// Çekirdek ölçekleme testinin işçisi: kendisine verilen ızgara diliminde Horn eğim çekirdeğini çalıştırır.

export interface BenchWorkerRequest {
  width: number
  height: number
  buffer: ArrayBuffer
}

export interface BenchWorkerResponse {
  sink: number
}

function slopeSlice(data: Float32Array, width: number, height: number): number {
  let sink = 0
  const at = (x: number, y: number): number => {
    const cx = Math.min(width - 1, Math.max(0, x))
    const cy = Math.min(height - 1, Math.max(0, y))
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

self.onmessage = (event: MessageEvent<BenchWorkerRequest>) => {
  const { width, height, buffer } = event.data
  const data = new Float32Array(buffer)
  const response: BenchWorkerResponse = { sink: slopeSlice(data, width, height) }
  self.postMessage(response)
}
