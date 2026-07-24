// Build-time OSM anlık görüntüsünü tembel yükler; osm_id dizini ve envanter sayımlarını sağlar.

import type { Feature, FeatureCollection } from 'geojson'
import { loadDataset } from '../core/dataset'

export type SnapshotTheme = 'bina' | 'yol' | 'poi'

const HEALTH_AMENITIES = new Set(['hospital', 'clinic', 'doctors', 'pharmacy', 'dentist'])
const EDUCATION_AMENITIES = new Set(['school', 'college', 'university', 'kindergarten'])

export interface SnapshotCounts {
  bina: number
  yol: number
  poi: number
  hastane: number
  okul: number
  eczane: number
  ibadet: number
  itfaiye: number
  emniyet: number
  saglikToplam: number
  egitimToplam: number
}

export interface SnapshotIndex {
  byOsmId: Map<string, Feature>
  counts: SnapshotCounts
}

export function osmKey(osmType: unknown, osmId: unknown): string {
  return `${String(osmType ?? '')}/${String(osmId ?? '')}`
}

function amenityOf(feature: Feature): string {
  const value = feature.properties?.['amenity']
  return typeof value === 'string' ? value : ''
}

function countThemes(features: Feature[]): SnapshotCounts {
  const counts: SnapshotCounts = {
    bina: 0,
    yol: 0,
    poi: 0,
    hastane: 0,
    okul: 0,
    eczane: 0,
    ibadet: 0,
    itfaiye: 0,
    emniyet: 0,
    saglikToplam: 0,
    egitimToplam: 0,
  }

  for (const feature of features) {
    const theme = feature.properties?.['tema']
    if (theme === 'bina') {
      counts.bina += 1
      continue
    }
    if (theme === 'yol') {
      counts.yol += 1
      continue
    }
    if (theme !== 'poi') continue

    counts.poi += 1
    const amenity = amenityOf(feature)
    if (amenity === 'hospital') counts.hastane += 1
    if (amenity === 'school') counts.okul += 1
    if (amenity === 'pharmacy') counts.eczane += 1
    if (amenity === 'place_of_worship') counts.ibadet += 1
    if (amenity === 'fire_station') counts.itfaiye += 1
    if (amenity === 'police') counts.emniyet += 1
    if (feature.properties?.['healthcare'] || HEALTH_AMENITIES.has(amenity)) counts.saglikToplam += 1
    if (feature.properties?.['education'] || EDUCATION_AMENITIES.has(amenity)) {
      counts.egitimToplam += 1
    }
  }

  return counts
}

let snapshotPromise: Promise<SnapshotIndex> | null = null

export function loadOsmSnapshot(): Promise<SnapshotIndex> {
  snapshotPromise ??= loadDataset<FeatureCollection>('osmSnapshot')
    .then((collection) => {
      const byOsmId = new Map<string, Feature>()
      for (const feature of collection.features) {
        byOsmId.set(osmKey(feature.properties?.['osm_type'], feature.properties?.['osm_id']), feature)
      }
      return { byOsmId, counts: countThemes(collection.features) }
    })
    .catch((error: unknown) => {
      snapshotPromise = null
      throw error
    })

  return snapshotPromise
}

const themeCache = new Map<SnapshotTheme, FeatureCollection>()

function buildingHeight(feature: Feature): number {
  const height = Number(feature.properties?.['height'])
  if (Number.isFinite(height) && height > 0) return height
  const levels = Number(feature.properties?.['building:levels'])
  if (Number.isFinite(levels) && levels > 0) return levels * 3
  return 6
}

export async function snapshotTheme(theme: SnapshotTheme): Promise<FeatureCollection> {
  const cached = themeCache.get(theme)
  if (cached) return cached

  const collection = await loadDataset<FeatureCollection>('osmSnapshot')
  const features = collection.features
    .filter((feature) => feature.properties?.['tema'] === theme)
    .map((feature) =>
      theme === 'bina'
        ? { ...feature, properties: { ...feature.properties, yukseklik: buildingHeight(feature) } }
        : feature,
    )

  const result: FeatureCollection = { type: 'FeatureCollection', features }
  themeCache.set(theme, result)
  return result
}
