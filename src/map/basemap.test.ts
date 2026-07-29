// Altlık çapraz geçişi: uzaklaşınca sokak, yakınlaşınca uydu. Ters interpolasyon bozulursa harita boş kalır.

import { describe, expect, it } from 'vitest'
import {
  BASEMAP_FADE_LAYER_ID,
  BASEMAP_LAYER_ID,
  basemapStyle,
  fadeOpacity,
} from './basemap'

describe('fadeOpacity', () => {
  it('yakın altlık uzakta 0, yakında 1 olur', () => {
    expect(fadeOpacity([11, 13])).toEqual(['interpolate', ['linear'], ['zoom'], 11, 0, 13, 1])
  })

  it('uzak altlık tam tersi çalışır', () => {
    expect(fadeOpacity([11, 13], true)).toEqual(['interpolate', ['linear'], ['zoom'], 11, 1, 13, 0])
  })

  it('iki eğri her zoom durağında toplamda 1 verir', () => {
    const yakin = fadeOpacity([11, 13]) as unknown[]
    const uzak = fadeOpacity([11, 13], true) as unknown[]
    // [interpolate, [linear], [zoom], z1, o1, z2, o2] → opaklıklar 4. ve 6. sırada.
    expect(Number(yakin[4]) + Number(uzak[4])).toBe(1)
    expect(Number(yakin[6]) + Number(uzak[6])).toBe(1)
  })
})

describe('basemapStyle', () => {
  it('vektör altlıkta stil URL dizesi döner', () => {
    expect(basemapStyle('liberty')).toBe('https://tiles.openfreemap.org/styles/liberty')
  })

  it('uydu altlığında iki raster katman üretir', () => {
    const style = basemapStyle('esriImagery')
    expect(typeof style).toBe('object')
    if (typeof style === 'string') throw new Error('nesne bekleniyordu')

    const ids = style.layers.map((layer) => layer.id)
    expect(ids).toEqual([BASEMAP_FADE_LAYER_ID, BASEMAP_LAYER_ID])
  })

  it('geçişsiz raster altlıkta tek katman kalır', () => {
    const style = basemapStyle('openTopoMap')
    if (typeof style === 'string') throw new Error('nesne bekleniyordu')
    expect(style.layers).toHaveLength(1)
    expect(style.layers[0]?.id).toBe(BASEMAP_LAYER_ID)
  })
})
