// Komşu ilçeler katmanı: Arnavutköy çevresindeki iki komşuluk halkasını sınır ve adlarıyla gösterir.

import type { FeatureCollection } from 'geojson'
import { loadDataset } from '../core/dataset'
import type { LayerModule } from '../core/types'
import { LABEL_FONT } from '../map/basemap'
import { setLayersVisible, upsertGeoJsonSource, upsertLayer } from '../map/overlays'

const SOURCE_ID = 'ilceler'
const LINE_LAYER = 'ilceler-cizgi'
const LABEL_LAYER = 'ilceler-etiket'

const RING_ONE = '#94a3b8'
const RING_TWO = '#64748b'

export const neighborDistrictsLayer: LayerModule = {
  id: 'komsu-ilceler',
  title: 'Komşu ilçeler',
  group: 'altlik',
  access: 'public',
  legend: [
    { color: RING_ONE, label: '1. halka (komşu)', shape: 'line' },
    { color: RING_TWO, label: '2. halka', shape: 'line' },
  ],

  async register(map) {
    upsertGeoJsonSource(map, SOURCE_ID, await loadDataset<FeatureCollection>('ilceler'))
    upsertLayer(map, {
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE_ID,
      filter: ['>', ['get', 'halka'], 0],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['match', ['get', 'halka'], 1, RING_ONE, RING_TWO],
        'line-width': ['match', ['get', 'halka'], 1, 1.6, 1],
        'line-opacity': 0.85,
        'line-dasharray': [3, 2],
      },
    })
    upsertLayer(map, {
      id: LABEL_LAYER,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['>', ['get', 'halka'], 0],
      maxzoom: 13,
      layout: {
        'text-field': ['get', 'ad'],
        'text-font': LABEL_FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 14],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.08,
      },
      paint: {
        'text-color': '#cbd5e1',
        'text-halo-color': '#0f172a',
        'text-halo-width': 1.4,
        'text-opacity': 0.9,
      },
    })
  },

  setVisible(map, visible) {
    setLayersVisible(map, [LINE_LAYER, LABEL_LAYER], visible)
  },
}
