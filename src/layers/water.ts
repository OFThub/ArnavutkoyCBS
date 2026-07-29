// Su katmanı: göl, baraj ve deniz yüzeyleriyle akarsu hatlarını openmaptiles kaynağından çizer.

import type { LayerModule } from '../core/types'
import { setLayersVisible, upsertLayer } from '../map/overlays'
import { ensureVectorSource, VECTOR_SOURCE_ID } from '../map/vectorSource'

const AREA_LAYER = 'su-alan'
const LINE_LAYER = 'su-akarsu'
const COLOR = '#3b82c4'

export const waterLayer: LayerModule = {
  id: 'su',
  title: 'Su yüzeyleri ve akarsular',
  group: 'kent',
  access: 'public',
  paintLayers: [AREA_LAYER, LINE_LAYER],
  legend: [
    { color: COLOR, label: 'Göl / baraj / deniz', shape: 'fill' },
    { color: '#5b9bd5', label: 'Akarsu', shape: 'line' },
  ],

  register(map) {
    ensureVectorSource(map)
    upsertLayer(map, {
      id: AREA_LAYER,
      type: 'fill',
      source: VECTOR_SOURCE_ID,
      'source-layer': 'water',
      paint: { 'fill-color': COLOR, 'fill-opacity': 0.55 },
    })
    upsertLayer(map, {
      id: LINE_LAYER,
      type: 'line',
      source: VECTOR_SOURCE_ID,
      'source-layer': 'waterway',
      minzoom: 11,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#5b9bd5',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 16, 3.2],
      },
    })
  },

  setVisible(map, visible) {
    setLayersVisible(map, [AREA_LAYER, LINE_LAYER], visible)
  },
}
