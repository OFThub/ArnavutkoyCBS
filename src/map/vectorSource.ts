// Kent katmanlarının beslendiği openmaptiles vektör kaynağı; vektör altlıkta mevcut olanı kullanır, raster altlıkta kendisi ekler.

import type { Map as MapLibreMap } from 'maplibre-gl'

export const VECTOR_SOURCE_ID = 'openmaptiles'
export const VECTOR_TILEJSON = 'https://tiles.openfreemap.org/planet'

export function ensureVectorSource(map: MapLibreMap): void {
  if (map.getSource(VECTOR_SOURCE_ID)) return
  map.addSource(VECTOR_SOURCE_ID, { type: 'vector', url: VECTOR_TILEJSON })
}
