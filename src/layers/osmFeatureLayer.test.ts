// Etiket filtresi katmanların hangi OSM özelliğini alacağını belirler; yanlış eşleşme yanlış harita demek.

import { describe, expect, it } from 'vitest'
import type { Feature } from 'geojson'
import { matchesTags, toPoint } from './osmFeatureLayer'

function node(properties: Record<string, unknown>): Feature {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [28.7, 41.2] }, properties }
}

describe('matchesTags', () => {
  it('etiket değeri listede olduğunda eşleşir', () => {
    expect(matchesTags(node({ amenity: 'recycling' }), { amenity: ['recycling'] })).toBe(true)
  })

  it('aynı etiketin başka değerini almaz', () => {
    expect(matchesTags(node({ amenity: 'pharmacy' }), { amenity: ['recycling'] })).toBe(false)
  })

  it('birden fazla etiketten herhangi biri yeterlidir', () => {
    const filter = { highway: ['cycleway'], bicycle: ['designated'] }
    expect(matchesTags(node({ bicycle: 'designated' }), filter)).toBe(true)
    expect(matchesTags(node({ highway: 'cycleway' }), filter)).toBe(true)
    expect(matchesTags(node({ highway: 'residential' }), filter)).toBe(false)
  })

  it('etiketi olmayan özelliği almaz', () => {
    expect(matchesTags(node({}), { amenity: ['marketplace'] })).toBe(false)
  })

  it('properties null olan özelliği almaz', () => {
    const feature: Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [28.7, 41.2] },
      properties: null,
    }
    expect(matchesTags(feature, { amenity: ['marketplace'] })).toBe(false)
  })

  it('sayısal etiket değerini string gibi eşleştirmez', () => {
    expect(matchesTags(node({ lanes: 2 }), { lanes: ['2'] })).toBe(false)
  })
})

describe('toPoint', () => {
  it('noktayı olduğu gibi bırakır', () => {
    const nokta = node({ amenity: 'marketplace' })
    expect(toPoint(nokta)).toBe(nokta)
  })

  it('poligonu ağırlık merkezine indirger — OSM pazar yerleri alan olarak işaretli', () => {
    const alan: Feature = {
      type: 'Feature',
      properties: { amenity: 'marketplace' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [28.0, 41.0],
            [28.2, 41.0],
            [28.2, 41.2],
            [28.0, 41.2],
            [28.0, 41.0],
          ],
        ],
      },
    }
    const sonuc = toPoint(alan)
    expect(sonuc.geometry.type).toBe('Point')
    const [lng, lat] = (sonuc.geometry as { coordinates: number[] }).coordinates
    expect(lng).toBeCloseTo(28.1, 5)
    expect(lat).toBeCloseTo(41.1, 5)
  })

  it('özellikleri korur', () => {
    const alan: Feature = {
      type: 'Feature',
      properties: { amenity: 'marketplace', name: 'Cuma Pazarı' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [28.0, 41.0],
          [28.2, 41.2],
        ],
      },
    }
    expect(toPoint(alan).properties).toEqual({ amenity: 'marketplace', name: 'Cuma Pazarı' })
  })
})
