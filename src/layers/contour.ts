// Eşyükselti eğrisi katmanı: seçilen aralıkta marching squares eğrilerini üretip çizer, aralık değişince tazelenir.

import type { FeatureCollection, LineString } from 'geojson'
import { contourLines } from '../core/contour'
import type { LayerModule } from '../core/types'
import { loadTerrainDerived } from '../data/terrainDerived'
import { LABEL_FONT } from '../map/basemap'
import { setLayersVisible, upsertGeoJsonSource, upsertLayer } from '../map/overlays'
import { useAppStore } from '../store/appStore'

const SOURCE_ID = 'kontur'
const LINE_LAYER = 'kontur-cizgi'
const MAJOR_LAYER = 'kontur-ana'
const LABEL_LAYER = 'kontur-etiket'

const cache = new Map<number, FeatureCollection<LineString>>()

export const contourLayer: LayerModule = {
  id: 'kontur',
  title: 'Eşyükselti eğrileri',
  group: 'topografya',
  access: 'public',
  legend: [
    { color: '#8d6e63', label: 'Ara eğri', shape: 'line' },
    { color: '#4e342e', label: 'Ana eğri (5 katı)', shape: 'line' },
  ],

  async register(map) {
    const interval = useAppStore.getState().contourInterval
    let data = cache.get(interval)
    if (!data) {
      const derived = await loadTerrainDerived()
      data = contourLines(derived.grid, { interval })
      cache.set(interval, data)
    }

    upsertGeoJsonSource(map, SOURCE_ID, data)
    upsertLayer(map, {
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': '#8d6e63', 'line-width': 0.7, 'line-opacity': 0.8 },
    })
    upsertLayer(map, {
      id: MAJOR_LAYER,
      type: 'line',
      source: SOURCE_ID,
      filter: ['==', ['%', ['get', 'yukselti'], interval * 5], 0],
      paint: { 'line-color': '#4e342e', 'line-width': 1.5, 'line-opacity': 0.9 },
    })
    upsertLayer(map, {
      id: LABEL_LAYER,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 12,
      filter: ['==', ['%', ['get', 'yukselti'], interval * 5], 0],
      layout: {
        'symbol-placement': 'line',
        'text-field': ['concat', ['to-string', ['get', 'yukselti']], ' m'],
        'text-font': LABEL_FONT,
        'text-size': 10,
        'symbol-spacing': 320,
        'text-max-angle': 30,
        'text-padding': 4,
      },
      paint: {
        'text-color': '#4e342e',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.4,
      },
    })
  },

  setVisible(map, visible) {
    setLayersVisible(map, [LINE_LAYER, MAJOR_LAYER, LABEL_LAYER], visible)
  },
}
