// Sensör füzyonu: manyetometre sert-demir kalibrasyonu, jiroskop-pusula tamamlayıcı filtresi, GNSS doğruluk kapısı.

export interface HeadingSample {
  pusulaDerece: number
  jiroskopDereceSaniye: number
  dtSaniye: number
}

export function normalizeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

export function angleDifference(a: number, b: number): number {
  const diff = normalizeAngle(a) - normalizeAngle(b)
  if (diff > 180) return diff - 360
  if (diff < -180) return diff + 360
  return diff
}

export function complementaryHeading(
  previous: number,
  sample: HeadingSample,
  alpha: number,
): number {
  const gyroPrediction = previous + sample.jiroskopDereceSaniye * sample.dtSaniye
  const correction = angleDifference(sample.pusulaDerece, gyroPrediction)
  return normalizeAngle(gyroPrediction + (1 - alpha) * correction)
}

export interface HardIronOffset {
  x: number
  y: number
  z: number
}

export function hardIronOffset(samples: { x: number; y: number; z: number }[]): HardIronOffset {
  if (samples.length === 0) return { x: 0, y: 0, z: 0 }
  const axis = (pick: (s: { x: number; y: number; z: number }) => number): number => {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (const sample of samples) {
      const value = pick(sample)
      if (value < min) min = value
      if (value > max) max = value
    }
    return (min + max) / 2
  }
  return { x: axis((s) => s.x), y: axis((s) => s.y), z: axis((s) => s.z) }
}

export function applyHardIron(
  sample: { x: number; y: number; z: number },
  offset: HardIronOffset,
): { x: number; y: number; z: number } {
  return { x: sample.x - offset.x, y: sample.y - offset.y, z: sample.z - offset.z }
}

export function headingFromMagnetometer(x: number, y: number): number {
  return normalizeAngle((Math.atan2(y, x) * 180) / Math.PI)
}

export interface FixSample {
  lng: number
  lat: number
  dogrulukM: number
  zaman: number
}

export function acceptFix(fix: FixSample, maxAccuracyM: number): boolean {
  return (
    Number.isFinite(fix.lng) &&
    Number.isFinite(fix.lat) &&
    Math.abs(fix.lat) <= 90 &&
    Math.abs(fix.lng) <= 180 &&
    fix.dogrulukM > 0 &&
    fix.dogrulukM <= maxAccuracyM
  )
}

export function smoothTrack(fixes: FixSample[], window: number): FixSample[] {
  if (window <= 1) return fixes
  const out: FixSample[] = []
  for (let index = 0; index < fixes.length; index += 1) {
    const start = Math.max(0, index - window + 1)
    const slice = fixes.slice(start, index + 1)
    let weightSum = 0
    let lng = 0
    let lat = 0
    for (const fix of slice) {
      const weight = 1 / Math.max(1, fix.dogrulukM)
      weightSum += weight
      lng += fix.lng * weight
      lat += fix.lat * weight
    }
    const current = fixes[index] as FixSample
    out.push({ ...current, lng: lng / weightSum, lat: lat / weightSum })
  }
  return out
}

export function trackLengthM(fixes: FixSample[]): number {
  let total = 0
  for (let index = 1; index < fixes.length; index += 1) {
    const a = fixes[index - 1] as FixSample
    const b = fixes[index] as FixSample
    const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180)
    const dx = (b.lng - a.lng) * 111320 * Math.cos(meanLat)
    const dy = (b.lat - a.lat) * 110540
    total += Math.hypot(dx, dy)
  }
  return total
}
