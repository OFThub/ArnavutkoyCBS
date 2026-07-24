// Altlık tanımlarını MapLibre stiline çevirir; vektör stil URL'i ve raster döşeme altlığı tek arayüzden servis edilir.

import type { StyleSpecification } from 'maplibre-gl'
import { BASEMAPS, type BasemapId } from '../config/sources'

export const BASEMAP_SOURCE_ID = 'altlik'
export const BASEMAP_LAYER_ID = 'altlik-raster'

export const BASEMAP_LIST = Object.values(BASEMAPS)

export function basemapStyle(id: BasemapId): string | StyleSpecification {
  const basemap = BASEMAPS[id]
  if (basemap.kind === 'style') return basemap.url

  return {
    version: 8,
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
}

export function basemapTitle(id: BasemapId): string {
  return BASEMAPS[id].title
}
