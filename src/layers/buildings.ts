// Bina katmanı: build-time OSM anlık görüntüsündeki yapıları 2B dolgu veya kat sayısından türetilen 3B kütle olarak çizer.

import type { LayerModule } from '../core/types'
import { snapshotTheme } from '../data/osmSnapshot'
import { setLayersVisible, upsertGeoJsonSource, upsertLayer } from '../map/overlays'
import { useAppStore } from '../store/appStore'

const SOURCE_ID = 'bina'
export const BUILDING_FILL_LAYER = 'bina-dolgu'
export const BUILDING_EXTRUDE_LAYER = 'bina-3b'

const COLOR = '#9c7a63'

export const buildingsLayer: LayerModule = {
  id: 'binalar',
  title: 'Binalar',
  group: 'kent',
  access: 'public',
  legend: [{ color: COLOR, label: 'Yapı kütlesi (OSM anlık görüntü)', shape: 'fill' }],

  async register(map) {
    upsertGeoJsonSource(map, SOURCE_ID, await snapshotTheme('bina'))
    upsertLayer(map, {
      id: BUILDING_FILL_LAYER,
      type: 'fill',
      source: SOURCE_ID,
      minzoom: 12,
      paint: { 'fill-color': COLOR, 'fill-opacity': 0.75, 'fill-outline-color': '#6d5344' },
    })
    upsertLayer(map, {
      id: BUILDING_EXTRUDE_LAYER,
      type: 'fill-extrusion',
      source: SOURCE_ID,
      minzoom: 13,
      paint: {
        'fill-extrusion-color': COLOR,
        'fill-extrusion-opacity': 0.85,
        'fill-extrusion-height': ['get', 'yukseklik'],
        'fill-extrusion-base': 0,
      },
    })
  },

  setVisible(map, visible) {
    const solid = useAppStore.getState().building3d
    setLayersVisible(map, [BUILDING_FILL_LAYER], visible && !solid)
    setLayersVisible(map, [BUILDING_EXTRUDE_LAYER], visible && solid)
  },
}
