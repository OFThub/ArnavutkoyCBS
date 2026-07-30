// Mahalle geometrisini İBB deprem senaryosu göstergeleriyle birleştirip tematik haritaya ve BI panosuna hazır veri üretir.

import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { loadDataset } from '../core/dataset'

export interface MahalleField {
  key: string
  label: string
  unit?: string
}

export const MAHALLE_FIELDS: MahalleField[] = [
  { key: 'cok_agir_hasarli_bina_sayisi', label: 'Çok ağır hasarlı bina' },
  { key: 'agir_hasarli_bina_sayisi', label: 'Ağır hasarlı bina' },
  { key: 'orta_hasarli_bina_sayisi', label: 'Orta hasarlı bina' },
  { key: 'hafif_hasarli_bina_sayisi', label: 'Hafif hasarlı bina' },
  { key: 'gecici_barinma', label: 'Geçici barınma', unit: 'kişi' },
  { key: 'dogalgaz_boru_hasari', label: 'Doğalgaz boru hasarı' },
  { key: 'icme_suyu_boru_hasari', label: 'İçme suyu boru hasarı' },
  { key: 'atik_su_boru_hasari', label: 'Atık su boru hasarı' },
  { key: 'alan_km2', label: 'Alan', unit: 'km²' },
]

interface DepremRow {
  mahalle_koy_uavt: string
  mahalle_adi?: string
  [key: string]: unknown
}

interface DepremFile {
  kayitlar?: DepremRow[]
}

let enrichedPromise: Promise<FeatureCollection<Polygon | MultiPolygon>> | null = null

export function loadMahalleThematic(): Promise<FeatureCollection<Polygon | MultiPolygon>> {
  enrichedPromise ??= (async () => {
    const [mahalle, deprem] = await Promise.all([
      loadDataset<FeatureCollection<Polygon | MultiPolygon>>('mahalle'),
      loadDataset<DepremFile>('depremSenaryo'),
    ])

    const byUavt = new Map<string, Record<string, unknown>>()
    for (const row of deprem.kayitlar ?? []) byUavt.set(String(row.mahalle_koy_uavt), row)

    const features: Feature<Polygon | MultiPolygon>[] = mahalle.features.map((feature) => {
      const props = feature.properties ?? {}
      const uavt = String(props['uavt_kod'])
      const row: Record<string, unknown> = byUavt.get(uavt) ?? {}
      const merged: Record<string, unknown> = { ...props }
      for (const field of MAHALLE_FIELDS) {
        if (field.key in row) merged[field.key] = Number(row[field.key]) || 0
        else if (field.key in props) merged[field.key] = Number(props[field.key]) || 0
        else merged[field.key] = 0
      }
      merged['ad'] = props['ad'] ?? row['mahalle_adi'] ?? uavt
      return { ...feature, properties: merged }
    })

    return { type: 'FeatureCollection', features } as FeatureCollection<Polygon | MultiPolygon>
  })().catch((error: unknown) => {
    enrichedPromise = null
    throw error
  })

  return enrichedPromise
}

export function fieldValues(
  collection: FeatureCollection<Polygon | MultiPolygon>,
  key: string,
): number[] {
  return collection.features
    .map((feature) => Number(feature.properties?.[key]))
    .filter((value) => Number.isFinite(value))
}
