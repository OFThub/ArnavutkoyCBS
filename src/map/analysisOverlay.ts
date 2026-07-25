// Analiz sonucundaki GeoJSON'u stil belirtimine göre haritaya basan tekil overlay; her çalıştırma öncekini değiştirir.

import type { Map as MapLibreMap } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import type { LayerStyleSpec } from '../core/types'
import {
  OVERLAY_ORDER,
  removeLayers,
  removeSources,
  upsertGeoJsonSource,
  type OverlayManager,
} from './overlays'

const SOURCE_ID = 'analiz-sonuc'
const FILL = 'analiz-sonuc-alan'
const LINE = 'analiz-sonuc-cizgi'
const CIRCLE = 'analiz-sonuc-nokta'

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

export interface AnalysisOverlayHandle {
  show(data: FeatureCollection, style?: LayerStyleSpec): void
  clear(): void
  destroy(): void
}

export function createAnalysisOverlay(
  map: MapLibreMap,
  overlays: OverlayManager,
): AnalysisOverlayHandle {
  let data: FeatureCollection = EMPTY
  let fillPaint: Record<string, unknown> = { 'fill-color': '#6366f1', 'fill-opacity': 0.45 }
  let linePaint: Record<string, unknown> = { 'line-color': '#4338ca', 'line-width': 2 }
  let circlePaint: Record<string, unknown> = {
    'circle-color': '#6366f1',
    'circle-radius': 6,
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1.5,
  }

  const apply = (target: MapLibreMap): void => {
    upsertGeoJsonSource(target, SOURCE_ID, data)
    if (!target.getLayer(FILL)) {
      target.addLayer({
        id: FILL,
        type: 'fill',
        source: SOURCE_ID,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: fillPaint,
      })
    }
    if (!target.getLayer(LINE)) {
      target.addLayer({
        id: LINE,
        type: 'line',
        source: SOURCE_ID,
        filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]],
        paint: linePaint,
      })
    }
    if (!target.getLayer(CIRCLE)) {
      target.addLayer({
        id: CIRCLE,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: circlePaint,
      })
    }
  }

  overlays.register({ id: SOURCE_ID, order: OVERLAY_ORDER.analysis, apply })

  const repaint = (): void => {
    if (map.getLayer(FILL)) for (const [k, v] of Object.entries(fillPaint)) map.setPaintProperty(FILL, k as never, v as never)
    if (map.getLayer(LINE)) for (const [k, v] of Object.entries(linePaint)) map.setPaintProperty(LINE, k as never, v as never)
    if (map.getLayer(CIRCLE)) for (const [k, v] of Object.entries(circlePaint)) map.setPaintProperty(CIRCLE, k as never, v as never)
  }

  return {
    show(next, style) {
      data = next
      if (style?.type === 'fill' && style.paint) fillPaint = style.paint
      if (style?.type === 'line' && style.paint) linePaint = style.paint
      if (style?.type === 'circle' && style.paint) circlePaint = style.paint
      if (map.getSource(SOURCE_ID)) {
        upsertGeoJsonSource(map, SOURCE_ID, data)
        repaint()
      }
    },
    clear() {
      data = EMPTY
      if (map.getSource(SOURCE_ID)) upsertGeoJsonSource(map, SOURCE_ID, data)
    },
    destroy() {
      removeLayers(map, [FILL, LINE, CIRCLE])
      removeSources(map, [SOURCE_ID])
      overlays.unregister(SOURCE_ID)
    },
  }
}
