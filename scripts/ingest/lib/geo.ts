// İlçe sınırıyla mekânsal filtreleme, kırpma ve koordinat doğrulama yardımcıları.

import * as turf from '@turf/turf'
import type {
  Feature,
  FeatureCollection,
  Geometry,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
  Position,
} from 'geojson'
import { readOutput } from './paths'

export const DISTRICT_BBOX: [number, number, number, number] = [28.4893, 41.0886, 28.8214, 41.4081]

export type DistrictPolygon = Feature<Polygon | MultiPolygon>

export async function loadDistrictPolygon(): Promise<DistrictPolygon> {
  const collection = await readOutput<FeatureCollection<Polygon | MultiPolygon>>('district.geojson')
  const feature = collection?.features[0]
  if (!feature) {
    throw new Error('district.geojson yok — önce npm run data:district çalıştırın')
  }
  return feature
}

export function inBbox(lon: number, lat: number, bbox = DISTRICT_BBOX): boolean {
  return lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]
}

export function isFiniteCoord(lon: unknown, lat: unknown): lon is number {
  return (
    typeof lon === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    Math.abs(lon) <= 180 &&
    Math.abs(lat) <= 90
  )
}

export function pointInDistrict(district: DistrictPolygon, lon: number, lat: number): boolean {
  if (!inBbox(lon, lat)) return false
  return turf.booleanPointInPolygon(turf.point([lon, lat]), district)
}

function bboxOverlaps(a: number[], b: readonly number[]): boolean {
  return !(
    (a[2] as number) < (b[0] as number) ||
    (a[0] as number) > (b[2] as number) ||
    (a[3] as number) < (b[1] as number) ||
    (a[1] as number) > (b[3] as number)
  )
}

export function featureTouchesDistrict(district: DistrictPolygon, feature: Feature<Geometry>): boolean {
  try {
    if (!bboxOverlaps(turf.bbox(feature), DISTRICT_BBOX)) return false

    const { type } = feature.geometry
    if (type === 'Point') {
      const [lon, lat] = feature.geometry.coordinates as [number, number]
      return turf.booleanPointInPolygon(turf.point([lon, lat]), district)
    }
    if (type === 'Polygon' || type === 'MultiPolygon') {
      return turf.booleanPointInPolygon(turf.centroid(feature), district)
    }
    return turf.booleanIntersects(feature, district)
  } catch {
    return false
  }
}

export function filterToDistrict<G extends Geometry>(
  district: DistrictPolygon,
  collection: FeatureCollection<G>,
): FeatureCollection<G> {
  return {
    type: 'FeatureCollection',
    features: collection.features.filter((feature) => featureTouchesDistrict(district, feature)),
  }
}

export function clipToDistrict(
  district: DistrictPolygon,
  feature: Feature<Polygon | MultiPolygon>,
): Feature<Polygon | MultiPolygon> | null {
  try {
    const clipped = turf.intersect(
      turf.featureCollection([feature, district]) as never,
    ) as Feature<Polygon | MultiPolygon> | null
    if (!clipped) return null
    clipped.properties = feature.properties
    return clipped
  } catch {
    return null
  }
}

export function areaKm2(feature: Feature<Polygon | MultiPolygon>): number {
  return Number((turf.area(feature) / 1_000_000).toFixed(3))
}

function segmentInsideDistrict(district: DistrictPolygon, segment: Feature<LineString>): boolean {
  const uzunluk = turf.length(segment, { units: 'kilometers' })
  if (uzunluk === 0) {
    const first = segment.geometry.coordinates[0]
    return !!first && pointInDistrict(district, first[0] as number, first[1] as number)
  }
  const orta = turf.along(segment, uzunluk / 2, { units: 'kilometers' })
  const [lon, lat] = orta.geometry.coordinates as [number, number]
  return pointInDistrict(district, lon, lat)
}

export function clipLineToDistrict(
  district: DistrictPolygon,
  feature: Feature<LineString | MultiLineString>,
): Feature<MultiLineString> | null {
  const parcalar: Position[][] = []

  for (const line of turf.flatten(feature).features) {
    if (line.geometry.type !== 'LineString') continue
    const tekil = line as Feature<LineString>

    let segmentler: Feature<LineString>[]
    try {
      const bolunmus = turf.lineSplit(tekil, district)
      segmentler =
        bolunmus.features.length > 0 ? (bolunmus.features as Feature<LineString>[]) : [tekil]
    } catch {
      segmentler = [tekil]
    }

    for (const segment of segmentler) {
      if (segmentInsideDistrict(district, segment)) {
        parcalar.push(segment.geometry.coordinates)
      }
    }
  }

  if (parcalar.length === 0) return null

  return {
    type: 'Feature',
    geometry: { type: 'MultiLineString', coordinates: parcalar },
    properties: feature.properties,
  }
}
