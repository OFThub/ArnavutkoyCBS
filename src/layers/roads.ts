// Yol katmanı: openmaptiles transportation kaynağını yol sınıfına göre genişlik ve renkle çizer, adlarını etiketler.

import type { LayerModule } from '../core/types'
import { LABEL_FONT } from '../map/basemap'
import { setLayersVisible, upsertLayer } from '../map/overlays'
import { ensureVectorSource, VECTOR_SOURCE_ID } from '../map/vectorSource'

const CASING_LAYER = 'yol-kenar'
const LINE_LAYER = 'yol-cizgi'
const LABEL_LAYER = 'yol-etiket'

export const ROAD_CLASSES = [
  { id: 'motorway', label: 'Otoyol', color: '#e2683c' },
  { id: 'trunk', label: 'Devlet yolu', color: '#ef8b58' },
  { id: 'primary', label: 'Ana arter', color: '#f4a259' },
  { id: 'secondary', label: 'İkincil yol', color: '#f7c59f' },
  { id: 'tertiary', label: 'Bağlantı yolu', color: '#d9c5a0' },
  { id: 'minor', label: 'Mahalle yolu', color: '#bdbdbd' },
] as const

const COLOR_MATCH: unknown[] = ['match', ['get', 'class']]
for (const item of ROAD_CLASSES) COLOR_MATCH.push(item.id, item.color)
COLOR_MATCH.push('#d0d0d0')

const WIDTH: unknown = [
  'interpolate',
  ['linear'],
  ['zoom'],
  9,
  ['match', ['get', 'class'], ['motorway', 'trunk'], 1.6, ['primary'], 1.1, 0.4],
  13,
  ['match', ['get', 'class'], ['motorway', 'trunk'], 5, ['primary'], 4, ['secondary'], 3, 1.6],
  17,
  ['match', ['get', 'class'], ['motorway', 'trunk'], 20, ['primary'], 16, ['secondary'], 12, 7],
]

export const roadsLayer: LayerModule = {
  id: 'yollar',
  title: 'Yollar',
  group: 'kent',
  access: 'public',
  paintLayers: [CASING_LAYER, LINE_LAYER, LABEL_LAYER],
  legend: ROAD_CLASSES.map((item) => ({ color: item.color, label: item.label, shape: 'line' })),

  register(map) {
    ensureVectorSource(map)
    upsertLayer(map, {
      id: CASING_LAYER,
      type: 'line',
      source: VECTOR_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 9,
      filter: ['!=', ['get', 'brunnel'], 'tunnel'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#6b5a4b',
        'line-opacity': 0.35,
        'line-width': ['*', WIDTH, 1.45] as never,
      },
    })
    upsertLayer(map, {
      id: LINE_LAYER,
      type: 'line',
      source: VECTOR_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 9,
      filter: ['!=', ['get', 'brunnel'], 'tunnel'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': COLOR_MATCH as never, 'line-width': WIDTH as never },
    })
    upsertLayer(map, {
      id: LABEL_LAYER,
      type: 'symbol',
      source: VECTOR_SOURCE_ID,
      'source-layer': 'transportation_name',
      minzoom: 13,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'name:tr'], ['get', 'name']],
        'text-font': LABEL_FONT,
        'text-size': 11,
        'text-max-angle': 30,
      },
      paint: { 'text-color': '#4a3f35', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 },
    })
  },

  setVisible(map, visible) {
    setLayersVisible(map, [CASING_LAYER, LINE_LAYER, LABEL_LAYER], visible)
  },
}
