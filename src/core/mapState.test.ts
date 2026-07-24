// Kalıcı bağlantı kodlaması, koordinat ayrıştırma, birim biçimleme ve maske geometrisinin testleri.

import { describe, expect, it } from 'vitest'
import { booleanPointInPolygon } from '@turf/turf'
import type { FeatureCollection } from 'geojson'
import { decodeMapState, encodeMapState, type MapState } from './mapState'
import { formatDecimal, formatDms, parseCoordinate, toDms } from './coords'
import { formatArea, formatDistance, metersPerPixel } from './format'
import { buildOutsideMask, firstAreaFeature } from './mask'

const STATE: MapState = {
  lng: 28.6554,
  lat: 41.2484,
  zoom: 12.5,
  bearing: 30,
  pitch: 45,
  basemap: 'esriImagery',
  layers: ['ilce-sinir', 'ilce-maske'],
}

describe('kalıcı bağlantı kodlaması', () => {
  it('kodlanan durumu birebir geri çözer', () => {
    const decoded = decodeMapState(`#${encodeMapState(STATE)}`)
    expect(decoded).toEqual(STATE)
  })

  it('katman listesi boşken de tur atar', () => {
    const empty = { ...STATE, layers: [] }
    expect(decodeMapState(encodeMapState(empty))).toEqual(empty)
  })

  it('bilinmeyen altlığı varsayılana düşürür', () => {
    expect(decodeMapState('#map=12.00/41.00000/28.00000/0/0&b=yok')?.basemap).toBe('liberty')
  })

  it('geçersiz girdilerde null döner', () => {
    expect(decodeMapState('')).toBeNull()
    expect(decodeMapState('#b=liberty')).toBeNull()
    expect(decodeMapState('#map=12/41/28')).toBeNull()
    expect(decodeMapState('#map=12/141/28/0/0')).toBeNull()
  })

  it('eğim ve dönüşü geçerli aralığa çeker', () => {
    const decoded = decodeMapState('#map=30.00/41.00000/28.00000/400/120')
    expect(decoded?.zoom).toBe(24)
    expect(decoded?.bearing).toBe(40)
    expect(decoded?.pitch).toBe(85)
  })
})

describe('koordinat ayrıştırma', () => {
  it('ondalık dereceyi enlem-boylam sırasıyla okur', () => {
    expect(parseCoordinate('41.2484, 28.6554')).toEqual({ lat: 41.2484, lng: 28.6554 })
    expect(parseCoordinate('41.2484 28.6554')).toEqual({ lat: 41.2484, lng: 28.6554 })
  })

  it('derece-dakika-saniyeyi çözer', () => {
    const parsed = parseCoordinate('41°14\'54.2"K 28°39\'19.4"D')
    expect(parsed?.lat).toBeCloseTo(41.24839, 4)
    expect(parsed?.lng).toBeCloseTo(28.65539, 4)
  })

  it('İngilizce yön harflerini ve ters sırayı destekler', () => {
    const parsed = parseCoordinate('28.6554 E, 41.2484 N')
    expect(parsed).toEqual({ lat: 41.2484, lng: 28.6554 })
  })

  it('güney ve batı yarımküreyi işaretler', () => {
    expect(parseCoordinate('12.5 S, 40.25 W')).toEqual({ lat: -12.5, lng: -40.25 })
    expect(parseCoordinate('-12.5, -40.25')).toEqual({ lat: -12.5, lng: -40.25 })
  })

  it('geçersiz girdiyi reddeder', () => {
    expect(parseCoordinate('')).toBeNull()
    expect(parseCoordinate('merkez')).toBeNull()
    expect(parseCoordinate('91.0, 28.0')).toBeNull()
    expect(parseCoordinate('41.0, 28.0, 15.0')).toBeNull()
  })

  it('DMS biçimlemesi ayrıştırmayla tutarlıdır', () => {
    expect(toDms(41.2484, 'lat')).toBe('41°14\'54.2"K')
    expect(toDms(-40.25, 'lng')).toBe('40°15\'00.0"B')
    const round = parseCoordinate(formatDms(28.6554, 41.2484))
    expect(round?.lat).toBeCloseTo(41.2484, 4)
    expect(round?.lng).toBeCloseTo(28.6554, 4)
  })

  it('ondalık gösterimi enlem-boylam sırasında verir', () => {
    expect(formatDecimal(28.6554, 41.2484)).toBe('41.24840, 28.65540')
  })
})

describe('birim biçimleme', () => {
  it('mesafeyi ölçeğe göre m ve km olarak yazar', () => {
    expect(formatDistance(5.5)).toBe('5,50 m')
    expect(formatDistance(240)).toBe('240,0 m')
    expect(formatDistance(1500)).toBe('1,50 km')
  })

  it('alanı m², ha ve km² eşiklerine göre yazar', () => {
    expect(formatArea(850)).toBe('850 m²')
    expect(formatArea(25000)).toBe('2,50 ha')
    expect(formatArea(4_780_000)).toBe('4,78 km²')
  })

  it('çözünürlüğü enleme göre hesaplar', () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(78271.5, 1)
    expect(metersPerPixel(41.2484, 12)).toBeCloseTo(14.36, 1)
  })
})

describe('ilçe dışı maskesi', () => {
  const district: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [28.4893, 41.0886],
              [28.8214, 41.0886],
              [28.8214, 41.4081],
              [28.4893, 41.4081],
              [28.4893, 41.0886],
            ],
          ],
        },
      },
    ],
  }

  it('ilçe geometrisini koleksiyondan seçer', () => {
    expect(firstAreaFeature(district)?.geometry.type).toBe('Polygon')
    expect(firstAreaFeature({ type: 'FeatureCollection', features: [] })).toBeNull()
  })

  it('maske ilçe içini kapsamaz, dışını kapsar', () => {
    const area = firstAreaFeature(district)
    expect(area).not.toBeNull()
    const mask = buildOutsideMask(area!)
    expect(mask).not.toBeNull()
    expect(booleanPointInPolygon([28.6554, 41.2484], mask!)).toBe(false)
    expect(booleanPointInPolygon([29.9, 41.0], mask!)).toBe(true)
    expect(booleanPointInPolygon([28.6554, 40.5], mask!)).toBe(true)
  })
})
