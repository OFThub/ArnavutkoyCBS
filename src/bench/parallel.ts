// Çekirdek ölçekleme ölçümü: sabit toplam işi 1..N işçiye bölüp hem ALU hem belleğe bağlı çekirdek için hızlanma eğrisi çıkarır.

import { scalingCurve, type ScalingPoint } from './stats'
import type { BenchKernel, BenchWorkerRequest, BenchWorkerResponse } from './bench.worker'

const SLICE_WIDTH = 512
const SLICE_HEIGHT = 512
export const TOTAL_TASKS = 24

export interface ScalingSet {
  kernel: BenchKernel
  baslik: string
  noktalar: ScalingPoint[]
}

export const KERNEL_TITLES: Record<BenchKernel, string> = {
  alu: 'Hesap (ALU)',
  bellek: 'Eğim (belleğe bağlı)',
}

function runOnce(worker: Worker, kernel: BenchKernel, tekrar: number): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const onMessage = (event: MessageEvent<BenchWorkerResponse>): void => {
      worker.removeEventListener('message', onMessage)
      resolve(event.data.sink)
    }
    worker.addEventListener('message', onMessage)
    worker.onerror = (event) => reject(new Error(event.message || 'işçi hatası'))
    const request: BenchWorkerRequest = {
      kernel,
      width: SLICE_WIDTH,
      height: SLICE_HEIGHT,
      tekrar,
    }
    worker.postMessage(request)
  })
}

function spawn(): Worker {
  return new Worker(new URL('./bench.worker.ts', import.meta.url), { type: 'module' })
}

async function measureOne(
  kernel: BenchKernel,
  ladder: number[],
  totalTasks: number,
): Promise<ScalingPoint[]> {
  const points: { isciSayisi: number; sureMs: number }[] = []

  for (const workerCount of ladder) {
    const workers = Array.from({ length: workerCount }, spawn)
    try {
      await Promise.all(workers.map((worker) => runOnce(worker, kernel, 1)))

      const share = Math.max(1, Math.round(totalTasks / workerCount))
      const started = performance.now()
      await Promise.all(workers.map((worker) => runOnce(worker, kernel, share)))
      const elapsed = performance.now() - started

      points.push({
        isciSayisi: workerCount,
        sureMs: (elapsed * totalTasks) / (share * workerCount),
      })
    } finally {
      for (const worker of workers) worker.terminate()
    }
  }

  return scalingCurve(points)
}

export async function measureScaling(
  ladder: number[],
  totalTasks = TOTAL_TASKS,
  onProgress?: (done: number, total: number) => void,
): Promise<ScalingSet[]> {
  const kernels: BenchKernel[] = ['alu', 'bellek']
  const sets: ScalingSet[] = []

  for (const [index, kernel] of kernels.entries()) {
    sets.push({
      kernel,
      baslik: KERNEL_TITLES[kernel],
      noktalar: await measureOne(kernel, ladder, totalTasks),
    })
    onProgress?.(index + 1, kernels.length)
  }

  return sets
}
