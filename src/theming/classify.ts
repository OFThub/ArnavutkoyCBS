// Tematik harita sınıflandırma çekirdeği: eşit aralık, kantil ve Jenks doğal kırılım yöntemleriyle sınıf sınırları ve renk rampası üretir.

export type ClassifyMethod = 'esit-aralik' | 'kantil' | 'jenks'

export interface ClassBreaks {
  method: ClassifyMethod
  breaks: number[]
  min: number
  max: number
}

export const SEQUENTIAL_RAMP = [
  '#fee5d9',
  '#fcae91',
  '#fb6a4a',
  '#de2d26',
  '#a50f15',
  '#67000d',
]

function cleanValues(values: number[]): number[] {
  return values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
}

export function equalInterval(values: number[], classes: number): number[] {
  const sorted = cleanValues(values)
  const min = sorted[0] ?? 0
  const max = sorted[sorted.length - 1] ?? min
  const step = (max - min) / classes
  const breaks: number[] = []
  for (let i = 1; i < classes; i += 1) breaks.push(min + step * i)
  return breaks
}

export function quantile(values: number[], classes: number): number[] {
  const sorted = cleanValues(values)
  if (sorted.length === 0) return []
  const breaks: number[] = []
  for (let i = 1; i < classes; i += 1) {
    const position = (sorted.length * i) / classes
    const lower = Math.floor(position) - 1
    const upper = Math.ceil(position) - 1
    const a = sorted[Math.max(0, lower)] ?? sorted[0]!
    const b = sorted[Math.min(sorted.length - 1, upper)] ?? a
    breaks.push((a + b) / 2)
  }
  return breaks
}

export function jenks(values: number[], classes: number): number[] {
  const data = cleanValues(values)
  const n = data.length
  if (n === 0 || classes < 2) return []
  if (n <= classes) {
    return data.slice(1).map((value, index) => (value + (data[index] ?? value)) / 2)
  }

  const mat1: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(classes + 1).fill(0))
  const mat2: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(classes + 1).fill(0))

  for (let i = 1; i <= classes; i += 1) {
    mat1[1]![i] = 1
    mat2[1]![i] = 0
    for (let j = 2; j <= n; j += 1) mat2[j]![i] = Number.POSITIVE_INFINITY
  }

  for (let l = 2; l <= n; l += 1) {
    let sum = 0
    let sumSquares = 0
    let count = 0
    for (let m = 1; m <= l; m += 1) {
      const lowerIndex = l - m + 1
      const value = data[lowerIndex - 1] ?? 0
      count += 1
      sum += value
      sumSquares += value * value
      const variance = sumSquares - (sum * sum) / count
      const i4 = lowerIndex - 1
      if (i4 !== 0) {
        for (let j = 2; j <= classes; j += 1) {
          const candidate = variance + (mat2[i4]![j - 1] ?? 0)
          if ((mat2[l]![j] ?? 0) >= candidate) {
            mat1[l]![j] = lowerIndex
            mat2[l]![j] = candidate
          }
        }
      }
    }
    mat1[l]![1] = 1
    mat2[l]![1] = sumSquares - (sum * sum) / count
  }

  const breaks: number[] = []
  let k = n
  for (let j = classes; j >= 2; j -= 1) {
    const id = (mat1[k]![j] ?? 1) - 1
    breaks.push(data[id] ?? 0)
    k = (mat1[k]![j] ?? 1) - 1
  }
  return breaks.reverse()
}

export function classify(values: number[], method: ClassifyMethod, classes: number): ClassBreaks {
  const sorted = cleanValues(values)
  const min = sorted[0] ?? 0
  const max = sorted[sorted.length - 1] ?? min
  const breaks =
    method === 'kantil'
      ? quantile(values, classes)
      : method === 'jenks'
        ? jenks(values, classes)
        : equalInterval(values, classes)
  return { method, breaks, min, max }
}

export function classOf(value: number, breaks: number[]): number {
  for (let i = 0; i < breaks.length; i += 1) {
    if (value < (breaks[i] ?? Number.POSITIVE_INFINITY)) return i
  }
  return breaks.length
}

export function rampColors(classes: number): string[] {
  if (classes <= SEQUENTIAL_RAMP.length) {
    const step = (SEQUENTIAL_RAMP.length - 1) / Math.max(1, classes - 1)
    return Array.from({ length: classes }, (_, i) => SEQUENTIAL_RAMP[Math.round(i * step)] ?? '#de2d26')
  }
  return Array.from({ length: classes }, (_, i) => SEQUENTIAL_RAMP[i % SEQUENTIAL_RAMP.length] ?? '#de2d26')
}

export interface LegendBucket {
  color: string
  label: string
  from: number
  to: number
}

export function buildLegend(result: ClassBreaks, classes: number): LegendBucket[] {
  const colors = rampColors(classes)
  const edges = [result.min, ...result.breaks, result.max]
  const buckets: LegendBucket[] = []
  for (let i = 0; i < classes; i += 1) {
    const from = edges[i] ?? result.min
    const to = edges[i + 1] ?? result.max
    buckets.push({
      color: colors[i] ?? '#de2d26',
      from,
      to,
      label: `${from.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} – ${to.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`,
    })
  }
  return buckets
}
