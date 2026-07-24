// Çalışma alanı maskesi: Arnavutköy ve iki komşuluk halkası dışında kalan her yeri kapatır.

import type { FeatureCollection } from 'geojson'
import { loadDataset } from '../core/dataset'
import { firstAreaFeature, maskCollection } from '../core/mask'
import type { LayerModule } from '../core/types'
import {
  OVERLAY_ORDER,
  keepOnTop,
  setLayersVisible,
  upsertGeoJsonSource,
  upsertLayer,
} from '../map/overlays'

const SOURCE_ID = 'calisma-alani-maske-kaynak'
const FILL_LAYER = 'calisma-alani-maske-dolgu'

keepOnTop(FILL_LAYER)

let maskPromise: Promise<FeatureCollection> | null = null

function maskData(): Promise<FeatureCollection> {
  maskPromise ??= loadDataset<FeatureCollection>('calismaAlani')
    .then((data) => {
      const area = firstAreaFeature(data)
      if (!area) throw new Error('Çalışma alanı geometrisi bulunamadı')
      return maskCollection(area) as FeatureCollection
    })
    .catch((error: unknown) => {
      maskPromise = null
      throw error
    })
  return maskPromise
}

export const workAreaMaskLayer: LayerModule = {
  id: 'calisma-alani-maske',
  title: 'Çalışma alanı dışı maskesi',
  group: 'altlik',
  access: 'public',
  order: OVERLAY_ORDER.mask,

  async register(map) {
    upsertGeoJsonSource(map, SOURCE_ID, await maskData())
    upsertLayer(map, {
      id: FILL_LAYER,
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': '#05080f', 'fill-opacity': 1 },
    })
  },

  setVisible(map, visible) {
    setLayersVisible(map, [FILL_LAYER], visible)
  },
}
