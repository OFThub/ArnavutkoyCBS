// Çizilen hat boyunca eşit aralıkla yükselti örnekleyip kesit grafiği ve tırmanış istatistiklerini üretir.

import { along, length } from '@turf/turf'
import type { Feature, LineString } from 'geojson'
import { elevationAt, type DemGrid } from './terrain'

export interface ProfileSample {
  mesafe: number
  yukselti: number
  lng: number
  lat: number
}

export interface ProfileResult {
  samples: ProfileSample[]
  totalMeters: number
  minElevation: number
  maxElevation: number
  ascent: number
  descent: number
}

export const PROFILE_SAMPLES = 200

export function elevationProfile(
  grid: DemGrid,
  line: Feature<LineString>,
  sampleCount: number = PROFILE_SAMPLES,
): ProfileResult {
  const totalMeters = length(line, { units: 'meters' })
  const count = Math.max(2, Math.min(sampleCount, 1000))
  const samples: ProfileSample[] = []

  let minElevation = Number.POSITIVE_INFINITY
  let maxElevation = Number.NEGATIVE_INFINITY
  let ascent = 0
  let descent = 0
  let previous: number | null = null

  for (let index = 0; index < count; index += 1) {
    const distance = (totalMeters * index) / (count - 1)
    const point = along(line, distance, { units: 'meters' })
    const [lng, lat] = point.geometry.coordinates
    if (typeof lng !== 'number' || typeof lat !== 'number') continue

    const elevation = elevationAt(grid, lng, lat)
    if (!Number.isFinite(elevation)) continue

    if (elevation < minElevation) minElevation = elevation
    if (elevation > maxElevation) maxElevation = elevation
    if (previous !== null) {
      const delta = elevation - previous
      if (delta > 0) ascent += delta
      else descent -= delta
    }
    previous = elevation

    samples.push({ mesafe: distance, yukselti: elevation, lng, lat })
  }

  return {
    samples,
    totalMeters,
    minElevation: Number.isFinite(minElevation) ? minElevation : 0,
    maxElevation: Number.isFinite(maxElevation) ? maxElevation : 0,
    ascent,
    descent,
  }
}
