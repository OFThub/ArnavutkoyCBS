// PostGIS sütunu GeoJSON gelmezse (hex WKB) katman sessizce yanlış çizmemeli, kaydı atlamalı.

import { describe, expect, it } from 'vitest'
import { rowsToCollection, toGeometry } from './supabaseLayer'

const POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [28.7, 41.2],
      [28.8, 41.2],
      [28.8, 41.3],
      [28.7, 41.2],
    ],
  ],
}

describe('toGeometry', () => {
  it('GeoJSON geometrisini kabul eder', () => {
    expect(toGeometry(POLYGON)).toEqual(POLYGON)
  })

  it('hex WKB dizesini reddeder', () => {
    expect(toGeometry('0103000020E6100000')).toBeNull()
  })

  it('null ve undefined reddeder', () => {
    expect(toGeometry(null)).toBeNull()
    expect(toGeometry(undefined)).toBeNull()
  })

  it('type alanı olmayan nesneyi reddeder', () => {
    expect(toGeometry({ coordinates: [28.7, 41.2] })).toBeNull()
  })

  it('koordinatı olmayan nesneyi reddeder', () => {
    expect(toGeometry({ type: 'Polygon' })).toBeNull()
  })

  it('GeometryCollection geometries ile kabul edilir', () => {
    const value = { type: 'GeometryCollection', geometries: [] }
    expect(toGeometry(value)).toEqual(value)
  })
})

describe('rowsToCollection', () => {
  it('geom sütununu özelliklerden çıkarır', () => {
    const { collection } = rowsToCollection([{ id: 1, ad: 'Boğazköy', geom: POLYGON }])
    expect(collection.features).toHaveLength(1)
    expect(collection.features[0]?.properties).toEqual({ id: 1, ad: 'Boğazköy' })
    expect(collection.features[0]?.geometry).toEqual(POLYGON)
  })

  it('okunamayan geometrileri sayar ve dışarıda bırakır', () => {
    const { collection, atlanan } = rowsToCollection([
      { id: 1, geom: POLYGON },
      { id: 2, geom: '0103000020E6100000' },
      { id: 3, geom: null },
    ])
    expect(collection.features).toHaveLength(1)
    expect(atlanan).toBe(2)
  })

  it('boş girdide boş koleksiyon döner', () => {
    const { collection, atlanan } = rowsToCollection([])
    expect(collection).toEqual({ type: 'FeatureCollection', features: [] })
    expect(atlanan).toBe(0)
  })
})
