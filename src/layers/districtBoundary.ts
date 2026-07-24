// İlçe sınırı katmanı: Nominatim relation 1766093 geometrisini haritaya çizer.

import type { FeatureCollection } from 'geojson'
import { loadDataset } from '../core/dataset'
import type { LayerModule } from '../core/types'
import { setLayersVisible, upsertGeoJsonSource, upsertLayer } from '../map/overlays'

const SOURCE_ID = 'ilce'
const GLOW_LAYER = 'ilce-sinir-parlama'
const LINE_LAYER = 'ilce-sinir-cizgi'
const COLOR = '#14b8a6'

export const districtBoundaryLayer: LayerModule = {
  id: 'ilce-sinir',
  title: 'İlçe sınırı',
  group: 'altlik',
  access: 'public',
  legend: [{ color: COLOR, label: 'Arnavutköy ilçe sınırı', shape: 'line' }],

  async register(map) {
    const data = await loadDataset<FeatureCollection>('district')
    upsertGeoJsonSource(map, SOURCE_ID, data)
    upsertLayer(map, {
      id: GLOW_LAYER,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': COLOR, 'line-width': 8, 'line-blur': 6, 'line-opacity': 0.45 },
    })
    upsertLayer(map, {
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': COLOR, 'line-width': 2.5 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })
  },

  setVisible(map, visible) {
    setLayersVisible(map, [GLOW_LAYER, LINE_LAYER], visible)
  },
}
