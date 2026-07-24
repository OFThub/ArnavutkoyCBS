// Araç ve analiz çıktılarını tek kaynak üzerinden alan, çizgi ve nokta olarak gösteren yeniden kullanılabilir sonuç katmanı.

import type { Map as MapLibreMap } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import {
  OVERLAY_ORDER,
  removeLayers,
  removeSources,
  upsertGeoJsonSource,
  upsertLayer,
  type OverlayManager,
} from './overlays'

export interface ResultOverlayHandle {
  setData(data: FeatureCollection): void
  clear(): void
  destroy(): void
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

export function createResultOverlay(
  map: MapLibreMap,
  overlays: OverlayManager,
  id: string,
  color: string,
  order: number = OVERLAY_ORDER.tool,
): ResultOverlayHandle {
  const fillLayer = `${id}-alan`
  const lineLayer = `${id}-cizgi`
  const pointLayer = `${id}-nokta`
  let data: FeatureCollection = EMPTY

  const apply = (target: MapLibreMap): void => {
    upsertGeoJsonSource(target, id, data)
    upsertLayer(target, {
      id: fillLayer,
      type: 'fill',
      source: id,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': color, 'fill-opacity': 0.22 },
    })
    upsertLayer(target, {
      id: lineLayer,
      type: 'line',
      source: id,
      filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]],
      paint: { 'line-color': color, 'line-width': 2.5 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })
    upsertLayer(target, {
      id: pointLayer,
      type: 'circle',
      source: id,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 6,
        'circle-color': color,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    })
  }

  const dispose = (target: MapLibreMap): void => {
    removeLayers(target, [fillLayer, lineLayer, pointLayer])
    removeSources(target, [id])
  }

  overlays.register({ id, order, apply, dispose })

  return {
    setData(next) {
      data = next
      if (map.getSource(id)) upsertGeoJsonSource(map, id, data)
    },
    clear() {
      data = EMPTY
      if (map.getSource(id)) upsertGeoJsonSource(map, id, data)
    },
    destroy() {
      overlays.unregister(id)
    },
  }
}
