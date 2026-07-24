// İlçe poligonunu dünya dikdörtgeninden çıkararak ilçe dışını kaplayan maske geometrisini üretir.

import { difference, featureCollection, polygon } from '@turf/turf'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'

export type AreaFeature = Feature<Polygon | MultiPolygon>

const WORLD_RING: [number, number][] = [
  [-180, -85.05113],
  [180, -85.05113],
  [180, 85.05113],
  [-180, 85.05113],
  [-180, -85.05113],
]

export function firstAreaFeature(data: FeatureCollection): AreaFeature | null {
  for (const feature of data.features) {
    const type = feature.geometry?.type
    if (type === 'Polygon' || type === 'MultiPolygon') return feature as AreaFeature
  }
  return null
}

export function buildOutsideMask(area: AreaFeature): AreaFeature | null {
  const world = polygon([WORLD_RING])
  return difference(featureCollection<Polygon | MultiPolygon>([world, area]))
}

export function maskCollection(area: AreaFeature): FeatureCollection<Polygon | MultiPolygon> {
  const mask = buildOutsideMask(area)
  return featureCollection<Polygon | MultiPolygon>(mask ? [mask] : [])
}
