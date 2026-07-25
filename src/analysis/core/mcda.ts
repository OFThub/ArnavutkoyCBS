// Çok ölçütlü karar analizinin saf çekirdeği: ölçüt normalleştirme, ağırlık doğrulama ve ağırlıklı skor.

export type CriterionDirection = 'benefit' | 'cost'

export interface Criterion {
  key: string
  label: string
  weight: number
  direction: CriterionDirection
}

export function normalizeValue(
  value: number,
  min: number,
  max: number,
  direction: CriterionDirection,
): number {
  if (!Number.isFinite(value)) return 0
  if (max === min) return 0.5
  const ratio = (value - min) / (max - min)
  const clamped = Math.min(1, Math.max(0, ratio))
  return direction === 'benefit' ? clamped : 1 - clamped
}

export function normalizeWeights(criteria: Criterion[]): Criterion[] {
  const total = criteria.reduce((sum, item) => sum + Math.max(0, item.weight), 0)
  if (total <= 0) {
    const even = criteria.length > 0 ? 1 / criteria.length : 0
    return criteria.map((item) => ({ ...item, weight: even }))
  }
  return criteria.map((item) => ({ ...item, weight: Math.max(0, item.weight) / total }))
}

export interface CriterionRange {
  key: string
  min: number
  max: number
}

export function computeRanges(
  rows: Record<string, number>[],
  keys: string[],
): Map<string, CriterionRange> {
  const ranges = new Map<string, CriterionRange>()
  for (const key of keys) {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (const row of rows) {
      const value = row[key]
      if (value === undefined || !Number.isFinite(value)) continue
      if (value < min) min = value
      if (value > max) max = value
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 0
      max = 1
    }
    ranges.set(key, { key, min, max })
  }
  return ranges
}

export function weightedScore(
  values: Record<string, number>,
  criteria: Criterion[],
  ranges: Map<string, CriterionRange>,
): number {
  let score = 0
  for (const criterion of criteria) {
    const range = ranges.get(criterion.key)
    if (!range) continue
    const value = values[criterion.key]
    if (value === undefined) continue
    score += criterion.weight * normalizeValue(value, range.min, range.max, criterion.direction)
  }
  return score
}

export function scoreCells<T extends Record<string, number>>(
  cells: T[],
  criteria: Criterion[],
): { cell: T; score: number }[] {
  const normalized = normalizeWeights(criteria)
  const ranges = computeRanges(cells, criteria.map((item) => item.key))
  return cells
    .map((cell) => ({ cell, score: weightedScore(cell, normalized, ranges) }))
    .sort((a, b) => b.score - a.score)
}
