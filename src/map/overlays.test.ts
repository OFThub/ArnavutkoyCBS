// Opaklık, katman türüne göre farklı boya özelliğine yazılır. Eşleme yanlışsa kaydırıcı sessizce hiçbir şey yapmaz.

import { describe, expect, it } from 'vitest'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { setLayersOpacity } from './overlays'

function fakeMap(types: Record<string, string>) {
  const yazilan: [string, string, unknown][] = []
  const map = {
    getLayer: (id: string) => (types[id] ? { id, type: types[id] } : undefined),
    setPaintProperty: (id: string, property: string, value: unknown) => {
      yazilan.push([id, property, value])
    },
  } as unknown as MapLibreMap
  return { map, yazilan }
}

describe('setLayersOpacity', () => {
  it('fill katmanına fill-opacity yazar', () => {
    const { map, yazilan } = fakeMap({ a: 'fill' })
    setLayersOpacity(map, ['a'], 0.4)
    expect(yazilan).toEqual([['a', 'fill-opacity', 0.4]])
  })

  it('circle katmanında hem dolgu hem kenar opaklığını yazar', () => {
    const { map, yazilan } = fakeMap({ a: 'circle' })
    setLayersOpacity(map, ['a'], 0.5)
    expect(yazilan.map(([, p]) => p)).toEqual(['circle-opacity', 'circle-stroke-opacity'])
  })

  it('symbol katmanında metin ve ikon opaklığını yazar', () => {
    const { map, yazilan } = fakeMap({ a: 'symbol' })
    setLayersOpacity(map, ['a'], 0.3)
    expect(yazilan.map(([, p]) => p)).toEqual(['text-opacity', 'icon-opacity'])
  })

  it('line, raster ve fill-extrusion türlerini tanır', () => {
    const { map, yazilan } = fakeMap({ a: 'line', b: 'raster', c: 'fill-extrusion' })
    setLayersOpacity(map, ['a', 'b', 'c'], 0.7)
    expect(yazilan.map(([, p]) => p)).toEqual([
      'line-opacity',
      'raster-opacity',
      'fill-extrusion-opacity',
    ])
  })

  it('haritada olmayan katmanı atlar, hata vermez', () => {
    const { map, yazilan } = fakeMap({ a: 'fill' })
    expect(() => setLayersOpacity(map, ['a', 'yok'], 0.5)).not.toThrow()
    expect(yazilan).toHaveLength(1)
  })

  it('bilinmeyen katman türünde hiçbir şey yazmaz', () => {
    const { map, yazilan } = fakeMap({ a: 'background' })
    setLayersOpacity(map, ['a'], 0.5)
    expect(yazilan).toEqual([])
  })

  it('değeri 0..1 aralığına sıkıştırır', () => {
    const { map, yazilan } = fakeMap({ a: 'fill', b: 'fill' })
    setLayersOpacity(map, ['a'], 5)
    setLayersOpacity(map, ['b'], -2)
    expect(yazilan.map(([, , v]) => v)).toEqual([1, 0])
  })
})
