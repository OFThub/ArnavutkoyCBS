// Ölçüm istatistikleri: medyan, yüzdelik, standart sapma ve paralel hızlanma/verimlilik hesabı.

export interface Timing {
  medyanMs: number
  p95Ms: number
  enIyiMs: number
  stdSapmaMs: number
  tekrar: number
}

export function median(values: number[]): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] as number
  return (((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2)
}

export function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))
  return sorted[rank] as number
}

export function stdDev(values: number[]): number {
  if (values.length === 0) return Number.NaN
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance =
    values.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / values.length
  return Math.sqrt(variance)
}

export function summarize(samples: number[]): Timing {
  return {
    medyanMs: median(samples),
    p95Ms: percentile(samples, 0.95),
    enIyiMs: samples.length === 0 ? Number.NaN : Math.min(...samples),
    stdSapmaMs: stdDev(samples),
    tekrar: samples.length,
  }
}

export function throughput(itemCount: number, ms: number): number {
  if (!(ms > 0)) return Number.NaN
  return itemCount / (ms / 1000)
}

export interface ScalingPoint {
  isciSayisi: number
  sureMs: number
  hizlanma: number
  verimlilik: number
}

export function scalingCurve(points: { isciSayisi: number; sureMs: number }[]): ScalingPoint[] {
  const baseline = points.find((point) => point.isciSayisi === 1)?.sureMs
  return points.map((point) => {
    const hizlanma = baseline && point.sureMs > 0 ? baseline / point.sureMs : Number.NaN
    return {
      ...point,
      hizlanma,
      verimlilik: Number.isFinite(hizlanma) ? hizlanma / point.isciSayisi : Number.NaN,
    }
  })
}

export function amdahlSerialFraction(workers: number, speedup: number): number {
  if (workers <= 1 || !(speedup > 0)) return Number.NaN
  const value = (workers / speedup - 1) / (workers - 1)
  return Math.min(1, Math.max(0, value))
}
