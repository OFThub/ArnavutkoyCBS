// Analiz modüllerinin paylaştığı yardımcılar: çalışma alanı geometrisi, hex ızgara, en yakın nokta mesafesi, sonuç sarmalayıcıları.

import {
  bbox,
  bboxClip,
  booleanPointInPolygon,
  distance,
  hexGrid,
  nearestPoint,
  pointOnFeature,
} from '@turf/turf'
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Point,
  Polygon,
} from 'geojson'
import { DISTRICT } from '../config/district'
import { loadDataset } from '../core/dataset'
import { firstAreaFeature, type AreaFeature } from '../core/mask'
import type { AnalysisResult } from '../core/types'

export async function districtArea(): Promise<AreaFeature> {
  const data = await loadDataset<FeatureCollection>('district')
  const area = firstAreaFeature(data)
  if (!area) throw new Error('İlçe sınırı bulunamadı')
  return area
}

export function buildHexGrid(area: AreaFeature, cellSideKm: number): Feature<Polygon>[] {
  const box = bbox(area)
  const grid = hexGrid(box, cellSideKm, { units: 'kilometers' })
  const cells: Feature<Polygon>[] = []
  for (const cell of grid.features) {
    const center = pointOnFeature(cell)
    if (booleanPointInPolygon(center, area)) cells.push(cell as Feature<Polygon>)
  }
  return cells
}

export function clipToArea(
  feature: Feature<Polygon | MultiPolygon>,
  area: AreaFeature,
): Feature<Polygon | MultiPolygon> | null {
  const box = bbox(area)
  const clipped = bboxClip(feature, box) as Feature<Polygon | MultiPolygon>
  return clipped.geometry.coordinates.length > 0 ? clipped : null
}

export function nearestDistanceM(
  from: [number, number],
  targets: FeatureCollection<Point>,
): number {
  if (targets.features.length === 0) return Number.POSITIVE_INFINITY
  const point = { type: 'Point' as const, coordinates: from }
  const nearest = nearestPoint(point, targets)
  return distance(point, nearest, { units: 'meters' })
}

export function cellCenter(cell: Feature<Polygon>): [number, number] {
  const center = pointOnFeature(cell)
  const [lng, lat] = center.geometry.coordinates
  return [lng ?? DISTRICT.center[0], lat ?? DISTRICT.center[1]]
}

export function emptyResult(summary: string): AnalysisResult {
  return { summary, metrics: [] }
}

export function pointsFrom(
  collection: FeatureCollection,
  filter?: (feature: Feature) => boolean,
): FeatureCollection<Point> {
  const features: Feature<Point>[] = []
  for (const feature of collection.features) {
    if (filter && !filter(feature)) continue
    if (feature.geometry.type === 'Point') {
      features.push(feature as Feature<Point>)
    } else {
      const center = pointOnFeature(feature)
      features.push({ type: 'Feature', properties: feature.properties, geometry: center.geometry })
    }
  }
  return { type: 'FeatureCollection', features }
}
