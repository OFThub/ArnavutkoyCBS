// Altlık tanımlarını MapLibre stiline çevirir; vektör stil URL'i ve raster döşeme altlığı tek arayüzden servis edilir.

import type { StyleSpecification } from 'maplibre-gl'
import { BASEMAPS, type BasemapId } from '../config/sources'

export const BASEMAP_SOURCE_ID = 'altlik'
export const BASEMAP_LAYER_ID = 'altlik-raster'
export const BASEMAP_FADE_SOURCE_ID = 'altlik-uzak'
export const BASEMAP_FADE_LAYER_ID = 'altlik-uzak-raster'

export const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'
export const LABEL_FONT = ['Noto Sans Regular']

export const BASEMAP_LIST = Object.values(BASEMAPS)

/**
 * Zoom'a göre çapraz geçiş opaklığı. `ters` uzaktaki altlık içindir: yakınlaşınca söner.
 * setStyle yerine tek stil içinde iki raster katman kullanılır — geçişte overlay'ler korunur.
 */
export function fadeOpacity(range: readonly [number, number], ters = false): unknown {
  const [uzak, yakin] = range
  return ['interpolate', ['linear'], ['zoom'], uzak, ters ? 1 : 0, yakin, ters ? 0 : 1]
}

export function basemapStyle(id: BasemapId): string | StyleSpecification {
  const basemap = BASEMAPS[id]
  if (basemap.kind === 'style') return basemap.url

  const fade = 'fadeTo' in basemap ? basemap.fadeTo : null
  const range = 'fadeZoom' in basemap ? basemap.fadeZoom : null

  const style: StyleSpecification = {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      [BASEMAP_SOURCE_ID]: {
        type: 'raster',
        tiles: [basemap.url],
        tileSize: 256,
        maxzoom: basemap.maxZoom,
        attribution: basemap.attribution,
      },
    },
    layers: [{ id: BASEMAP_LAYER_ID, type: 'raster', source: BASEMAP_SOURCE_ID }],
  }

  if (!fade || !range) return style

  // Uzak altlık altta durur; yakın altlık üstünde açılıp kapanarak geçişi yapar.
  style.sources[BASEMAP_FADE_SOURCE_ID] = {
    type: 'raster',
    tiles: [fade.url],
    tileSize: 256,
    maxzoom: fade.maxZoom,
    attribution: fade.attribution,
  }
  style.layers = [
    {
      id: BASEMAP_FADE_LAYER_ID,
      type: 'raster',
      source: BASEMAP_FADE_SOURCE_ID,
      paint: { 'raster-opacity': fadeOpacity(range, true) as never },
    },
    {
      id: BASEMAP_LAYER_ID,
      type: 'raster',
      source: BASEMAP_SOURCE_ID,
      paint: { 'raster-opacity': fadeOpacity(range) as never },
    },
  ]

  return style
}

export function basemapTitle(id: BasemapId): string {
  return BASEMAPS[id].title
}
