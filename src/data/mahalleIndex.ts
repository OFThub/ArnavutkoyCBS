// Mahalle geometrilerini tembel yükler ve verilen koordinatın hangi mahalleye düştüğünü bulur.

import { booleanPointInPolygon } from '@turf/turf'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { loadDataset } from '../core/dataset'

export interface MahalleInfo {
  uavtKod: string
  ad: string
  alanKm2: number | null
  yaklasik: boolean
}

let mahallePromise: Promise<FeatureCollection<Polygon | MultiPolygon>> | null = null

function loadMahalle(): Promise<FeatureCollection<Polygon | MultiPolygon>> {
  mahallePromise ??= loadDataset<FeatureCollection<Polygon | MultiPolygon>>('mahalle').catch(
    (error: unknown) => {
      mahallePromise = null
      throw error
    },
  )
  return mahallePromise
}

function toInfo(feature: Feature<Polygon | MultiPolygon>): MahalleInfo {
  const properties = feature.properties ?? {}
  const area = properties['alan_km2']
  return {
    uavtKod: String(properties['uavt_kod'] ?? ''),
    ad: String(properties['ad'] ?? ''),
    alanKm2: typeof area === 'number' ? area : null,
    yaklasik: properties['yaklasik'] !== false,
  }
}

export async function findMahalle(lng: number, lat: number): Promise<MahalleInfo | null> {
  const collection = await loadMahalle()
  for (const feature of collection.features) {
    if (booleanPointInPolygon([lng, lat], feature)) return toInfo(feature)
  }
  return null
}
