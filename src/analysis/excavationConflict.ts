// Kazı ruhsat çakışma tespiti: aynı yol kesitinde tarihleri örtüşen kazıları bulur; sunucu verisi yoksa örnek veriyle gösterir.

import { lineString, nearestPointOnLine, pointToLineDistance } from '@turf/turf'
import type { Feature, FeatureCollection } from 'geojson'
import { findExcavationConflicts, type ExcavationPermit } from './core/excavation'
import { supabase } from '../lib/supabase'
import { DISTRICT } from '../config/district'
import type { AnalysisModule } from '../core/types'

interface ExcavationParams {
  yakinlikM: number
}

function segmentDistance(a: GeoJSON.LineString, b: GeoJSON.LineString): number {
  let min = Number.POSITIVE_INFINITY
  const lineB = lineString(b.coordinates)
  for (const coord of a.coordinates) {
    const point = { type: 'Point' as const, coordinates: coord }
    const distance = pointToLineDistance(point, lineB, { units: 'meters' })
    if (distance < min) min = distance
  }
  return min
}

function demoPermits(): ExcavationPermit[] {
  const [lng, lat] = DISTRICT.center
  const along = (dx: number): GeoJSON.LineString => ({
    type: 'LineString',
    coordinates: [
      [lng + dx, lat],
      [lng + dx + 0.004, lat + 0.0005],
    ],
  })
  return [
    { id: 'İSKİ-101', kurum: 'İSKİ', baslangic: '2026-08-01', bitis: '2026-08-25', geometry: along(0) },
    { id: 'İGDAŞ-204', kurum: 'İGDAŞ', baslangic: '2026-08-15', bitis: '2026-09-10', geometry: along(0.00005) },
    { id: 'BEDAŞ-77', kurum: 'BEDAŞ', baslangic: '2026-10-01', bitis: '2026-10-20', geometry: along(0.02) },
  ]
}

export const excavationConflictAnalysis: AnalysisModule<ExcavationParams> = {
  id: 'kazi-cakisma',
  title: 'Altyapı kazı çakışması',
  category: 'idari',
  access: 'personel',
  params: [
    { kind: 'number', name: 'yakinlikM', label: 'Yakınlık eşiği', default: 25, min: 5, max: 200, step: 5, unit: 'm' },
  ],

  async run(_ctx, params) {
    let permits: ExcavationPermit[] = []
    let ornek = false

    if (supabase) {
      const { data, error } = await supabase
        .from('kazi_ruhsat')
        .select('id, kurum, baslangic, bitis, geom')
        .limit(5000)
      if (error) throw new Error(`Kazı ruhsatları okunamadı: ${error.message}`)
      permits = (data ?? [])
        .filter((row) => row.geom)
        .map((row) => ({
          id: row.id as string | number,
          kurum: String(row.kurum),
          baslangic: String(row.baslangic),
          bitis: String(row.bitis),
          geometry: row.geom as unknown as GeoJSON.LineString,
        }))
    }

    if (permits.length === 0) {
      permits = demoPermits()
      ornek = true
    }

    const conflicts = findExcavationConflicts(permits, {
      proximityM: params.yakinlikM,
      segmentDistance,
    })

    const permitById = new Map(permits.map((permit) => [permit.id, permit]))
    const features: Feature[] = []
    for (const permit of permits) {
      features.push({
        type: 'Feature',
        properties: { id: permit.id, kurum: permit.kurum },
        geometry: permit.geometry,
      })
    }
    for (const conflict of conflicts) {
      const a = permitById.get(conflict.a)
      const b = permitById.get(conflict.b)
      if (!a || !b) continue
      const pa = a.geometry.coordinates[0]
      const near = nearestPointOnLine(lineString(b.geometry.coordinates), {
        type: 'Point',
        coordinates: pa ?? [0, 0],
      })
      features.push({
        type: 'Feature',
        properties: { cakisma: `${conflict.a} × ${conflict.b}`, gun: conflict.gunlukCakisma },
        geometry: near.geometry,
      })
    }

    const ornekNote = ornek
      ? ' (Sunucuda kazı ruhsatı bulunmadığı için örnek veriyle gösterildi; İSKİ-101 ve İGDAŞ-204 kasıtlı çakıştırıldı.)'
      : ''

    return {
      summary: `${permits.length} kazı ruhsatı incelendi; ${conflicts.length} çakışma bulundu.${ornekNote}`,
      metrics: [
        { label: 'Ruhsat', value: permits.length },
        { label: 'Çakışma', value: conflicts.length },
        { label: 'Yakınlık eşiği', value: params.yakinlikM, unit: 'm' },
      ],
      geojson: { type: 'FeatureCollection', features } as FeatureCollection,
      style: { type: 'line', paint: { 'line-color': '#e11d48', 'line-width': 3 } },
      table: {
        columns: ['Çakışan ruhsatlar', 'Örtüşme günü', 'Mesafe (m)'],
        rows: conflicts.map((conflict) => [
          `${conflict.a} × ${conflict.b}`,
          conflict.gunlukCakisma,
          Math.round(conflict.mesafeM),
        ]),
      },
    }
  },
}
