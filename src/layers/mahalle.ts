// Mahalle sınırları: ilçe sınırının içini okunur parçalara böler, adları haritaya yazar.
// Veri kaynağı yaklaşık (voronoi) olan mahalleler kesikli çizgiyle ayrılır — kesin sınır izlenimi verilmez.

import type { FeatureCollection } from 'geojson'
import { loadDataset } from '../core/dataset'
import type { LayerModule } from '../core/types'
import { LABEL_FONT } from '../map/basemap'
import { setLayersVisible, upsertGeoJsonSource, upsertLayer } from '../map/overlays'

const SOURCE_ID = 'mahalle'
const FILL_LAYER = 'mahalle-alan'
const LINE_LAYER = 'mahalle-sinir-cizgi'
const APPROX_LAYER = 'mahalle-sinir-yaklasik'
const LABEL_LAYER = 'mahalle-etiket'

const COLOR = '#8aa2c0'
const LAYERS = [FILL_LAYER, LINE_LAYER, APPROX_LAYER, LABEL_LAYER]

export const mahalleLayer: LayerModule = {
  id: 'mahalle-sinir',
  title: 'Mahalle sınırları',
  group: 'altlik',
  access: 'public',
  paintLayers: LAYERS,
  legend: [
    { color: COLOR, label: 'Mahalle sınırı (resmî)', shape: 'line' },
    { color: '#c8a45a', label: 'Mahalle sınırı (yaklaşık)', shape: 'line' },
  ],

  async register(map) {
    const data = await loadDataset<FeatureCollection>('mahalle')
    upsertGeoJsonSource(map, SOURCE_ID, data)

    // Çok hafif dolgu: mahalleler birbirinden ayrılsın ama altlık okunmaya devam etsin.
    upsertLayer(map, {
      id: FILL_LAYER,
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': COLOR, 'fill-opacity': 0.06 },
    })

    upsertLayer(map, {
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE_ID,
      filter: ['==', ['get', 'yaklasik'], false],
      paint: {
        'line-color': COLOR,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.4, 16, 2.6],
        'line-opacity': 0.95,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })

    upsertLayer(map, {
      id: APPROX_LAYER,
      type: 'line',
      source: SOURCE_ID,
      filter: ['!=', ['get', 'yaklasik'], false],
      paint: {
        'line-color': '#c8a45a',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.4, 16, 2.4],
        'line-opacity': 0.95,
        'line-dasharray': [2, 2],
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })

    upsertLayer(map, {
      id: LABEL_LAYER,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 9.5,
      layout: {
        'text-field': ['coalesce', ['get', 'ad'], ''],
        'text-font': LABEL_FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 9.5, 16, 13],
        'text-max-width': 10,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.06,
        'symbol-placement': 'point',
      },
      paint: {
        'text-color': '#1f2937',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.6,
      },
    })
  },

  setVisible(map, visible) {
    setLayersVisible(map, LAYERS, visible)
  },
}
