// İlçe dışını karartan maske katmanı: dünya dikdörtgeninden ilçe poligonu çıkarılarak üretilir.

import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { loadDataset } from '../core/dataset'
import { firstAreaFeature, maskCollection } from '../core/mask'
import type { LayerModule } from '../core/types'
import { setLayersVisible, upsertGeoJsonSource, upsertLayer } from '../map/overlays'

const SOURCE_ID = 'ilce-maske-kaynak'
const FILL_LAYER = 'ilce-maske-dolgu'

let maskPromise: Promise<FeatureCollection<Polygon | MultiPolygon>> | null = null

function maskData(): Promise<FeatureCollection<Polygon | MultiPolygon>> {
  maskPromise ??= loadDataset<FeatureCollection>('district').then((data) => {
    const area = firstAreaFeature(data)
    if (!area) throw new Error('İlçe geometrisi bulunamadı; npm run data:district çalıştırın')
    return maskCollection(area)
  })
  return maskPromise
}

export const districtMaskLayer: LayerModule = {
  id: 'ilce-maske',
  title: 'İlçe dışı maskesi',
  group: 'altlik',
  access: 'public',

  async register(map) {
    upsertGeoJsonSource(map, SOURCE_ID, await maskData())
    upsertLayer(map, {
      id: FILL_LAYER,
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': '#0b1120', 'fill-opacity': 0.55 },
    })
  },

  setVisible(map, visible) {
    setLayersVisible(map, [FILL_LAYER], visible)
  },
}
