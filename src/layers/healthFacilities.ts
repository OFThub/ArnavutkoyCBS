// İBB sağlık kurumları katmanı: build-time indirilen resmî kurum listesini haritada gösterir.

import type { FeatureCollection } from 'geojson'
import { loadDataset } from '../core/dataset'
import type { LayerModule } from '../core/types'
import { LABEL_FONT } from '../map/basemap'
import { setLayersVisible, upsertGeoJsonSource, upsertLayer } from '../map/overlays'

const SOURCE_ID = 'saglik-kurumu'
const CIRCLE_LAYER = 'saglik-kurumu-daire'
const LABEL_LAYER = 'saglik-kurumu-etiket'
const COLOR = '#be123c'

export const healthFacilitiesLayer: LayerModule = {
  id: 'saglik-kurumu',
  title: 'Sağlık kurumları (İBB)',
  group: 'kent',
  access: 'public',
  paintLayers: [CIRCLE_LAYER, LABEL_LAYER],
  legend: [{ color: COLOR, label: 'İBB kayıtlı sağlık kurumu', shape: 'circle' }],

  async register(map) {
    const data = await loadDataset<FeatureCollection>('saglikKurumu')
    upsertGeoJsonSource(map, SOURCE_ID, data)
    upsertLayer(map, {
      id: CIRCLE_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-color': COLOR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 8],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
      },
    })
    upsertLayer(map, {
      id: LABEL_LAYER,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 14,
      layout: {
        'text-field': ['get', 'ad'],
        'text-font': LABEL_FONT,
        'text-size': 11,
        'text-anchor': 'top',
        'text-offset': [0, 0.8],
        'text-max-width': 10,
      },
      paint: { 'text-color': '#7f1d1d', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 },
    })
  },

  setVisible(map, visible) {
    setLayersVisible(map, [CIRCLE_LAYER, LABEL_LAYER], visible)
  },
}
