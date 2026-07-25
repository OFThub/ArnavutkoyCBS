// Kazı ruhsatlarının zaman-mekân çakışmasını tespit eden saf çekirdek: tarih aralığı + hat yakınlığı.

export interface ExcavationPermit {
  id: string | number
  kurum: string
  baslangic: string
  bitis: string
  geometry: GeoJSON.LineString
}

export interface ExcavationConflict {
  a: string | number
  b: string | number
  gunlukCakisma: number
  mesafeM: number
}

export function daysOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): number {
  const start = Math.max(Date.parse(aStart), Date.parse(bStart))
  const end = Math.min(Date.parse(aEnd), Date.parse(bEnd))
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0
  return Math.round((end - start) / 86400000) + 1
}

export interface ConflictOptions {
  proximityM: number
  segmentDistance: (a: GeoJSON.LineString, b: GeoJSON.LineString) => number
}

export function findExcavationConflicts(
  permits: ExcavationPermit[],
  options: ConflictOptions,
): ExcavationConflict[] {
  const conflicts: ExcavationConflict[] = []
  for (let i = 0; i < permits.length; i += 1) {
    for (let j = i + 1; j < permits.length; j += 1) {
      const a = permits[i]
      const b = permits[j]
      if (!a || !b) continue

      const overlap = daysOverlap(a.baslangic, a.bitis, b.baslangic, b.bitis)
      if (overlap <= 0) continue

      const distance = options.segmentDistance(a.geometry, b.geometry)
      if (distance > options.proximityM) continue

      conflicts.push({ a: a.id, b: b.id, gunlukCakisma: overlap, mesafeM: distance })
    }
  }
  return conflicts.sort((x, y) => y.gunlukCakisma - x.gunlukCakisma)
}
