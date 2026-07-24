// Kabartma gölgelendirme katmanı: terrarium raster-dem kaynağını MapLibre'nin yerel hillshade katmanıyla çizer.

import type { LayerModule } from '../core/types'
import { setLayersVisible, upsertLayer } from '../map/overlays'
import { DEM_SOURCE_ID, ensureDemSource } from '../map/terrainSource'

const LAYER_ID = 'golgelendirme-katman'

export const hillshadeLayer: LayerModule = {
  id: 'golgelendirme',
  title: 'Kabartma gölgelendirme',
  group: 'topografya',
  access: 'public',

  register(map) {
    ensureDemSource(map)
    upsertLayer(map, {
      id: LAYER_ID,
      type: 'hillshade',
      source: DEM_SOURCE_ID,
      paint: {
        'hillshade-exaggeration': 0.55,
        'hillshade-shadow-color': '#2a3f5f',
        'hillshade-highlight-color': '#ffffff',
        'hillshade-accent-color': '#5b7fa6',
      },
    })
  },

  setVisible(map, visible) {
    setLayersVisible(map, [LAYER_ID], visible)
  },
}
