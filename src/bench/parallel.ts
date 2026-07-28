// Çekirdek ölçekleme ölçümü: aynı hesap yükünü 1..N işçiye bölüp hızlanma ve paralel verimlilik eğrisi çıkarır.

import { scalingCurve, type ScalingPoint } from './stats'
import type { BenchWorkerRequest, BenchWorkerResponse } from './bench.worker'

const SLICE_WIDTH = 512
const SLICE_HEIGHT = 512

function sliceData(): Float32Array {
  const data = new Float32Array(SLICE_WIDTH * SLICE_HEIGHT)
  for (let index = 0; index < data.length; index += 1) {
    data[index] = 100 + Math.sin(index / 53) * 40 + Math.cos(index / 31) * 25
  }
  return data
}

function runOnce(worker: Worker, data: Float32Array): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const copy = data.slice()
    const onMessage = (event: MessageEvent<BenchWorkerResponse>): void => {
      worker.removeEventListener('message', onMessage)
      resolve(event.data.sink)
    }
    worker.addEventListener('message', onMessage)
    worker.onerror = (event) => reject(new Error(event.message || 'işçi hatası'))
    const request: BenchWorkerRequest = {
      width: SLICE_WIDTH,
      height: SLICE_HEIGHT,
      buffer: copy.buffer as ArrayBuffer,
    }
    worker.postMessage(request, [copy.buffer as ArrayBuffer])
  })
}

function spawn(): Worker {
  return new Worker(new URL('./bench.worker.ts', import.meta.url), { type: 'module' })
}

export async function measureScaling(
  ladder: number[],
  tasksPerRun: number,
  onProgress?: (done: number, total: number) => void,
): Promise<ScalingPoint[]> {
  const data = sliceData()
  const points: { isciSayisi: number; sureMs: number }[] = []

  for (const [index, workerCount] of ladder.entries()) {
    const workers = Array.from({ length: workerCount }, spawn)
    try {
      await Promise.all(workers.map((worker) => runOnce(worker, data)))

      const started = performance.now()
      let next = 0
      await Promise.all(
        workers.map(async (worker) => {
          for (;;) {
            const task = next
            next += 1
            if (task >= tasksPerRun) return
            await runOnce(worker, data)
          }
        }),
      )
      points.push({ isciSayisi: workerCount, sureMs: performance.now() - started })
    } finally {
      for (const worker of workers) worker.terminate()
    }
    onProgress?.(index + 1, ladder.length)
  }

  return scalingCurve(points)
}
