// Taşkın riski indeksi: düşük yükselti, düşük eğim ve akarsuya yakınlığın ağırlıklı birleşimi.

export interface FloodInputs {
  elevation: number
  slopePercent: number
  distanceToWaterM: number
}

export interface FloodThresholds {
  elevationLow: number
  elevationHigh: number
  slopeFlat: number
  slopeSteep: number
  waterNearM: number
  waterFarM: number
}

export const DEFAULT_FLOOD_THRESHOLDS: FloodThresholds = {
  elevationLow: 20,
  elevationHigh: 150,
  slopeFlat: 2,
  slopeSteep: 12,
  waterNearM: 50,
  waterFarM: 500,
}

function inverseBand(value: number, near: number, far: number): number {
  if (value <= near) return 1
  if (value >= far) return 0
  return (far - value) / (far - near)
}

export function floodIndex(
  inputs: FloodInputs,
  thresholds: FloodThresholds = DEFAULT_FLOOD_THRESHOLDS,
): number {
  const elevationScore = inverseBand(inputs.elevation, thresholds.elevationLow, thresholds.elevationHigh)
  const slopeScore = inverseBand(inputs.slopePercent, thresholds.slopeFlat, thresholds.slopeSteep)
  const waterScore = inverseBand(inputs.distanceToWaterM, thresholds.waterNearM, thresholds.waterFarM)

  return 0.4 * elevationScore + 0.3 * slopeScore + 0.3 * waterScore
}

export type FloodClass = 'dusuk' | 'orta' | 'yuksek' | 'cok-yuksek'

export function classifyFlood(index: number): FloodClass {
  if (index >= 0.75) return 'cok-yuksek'
  if (index >= 0.5) return 'yuksek'
  if (index >= 0.25) return 'orta'
  return 'dusuk'
}

export const FLOOD_CLASS_STYLE: Record<FloodClass, { label: string; color: string }> = {
  dusuk: { label: 'Düşük', color: '#2c7bb6' },
  orta: { label: 'Orta', color: '#abd9e9' },
  yuksek: { label: 'Yüksek', color: '#fdae61' },
  'cok-yuksek': { label: 'Çok yüksek', color: '#d7191c' },
}
