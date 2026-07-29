// Stil değişiminde silinen özel kaynak ve katmanları yeniden kuran overlay yöneticisi ve idempotent ekleme yardımcıları.

import type { AddLayerObject, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import type { GeoJSON } from 'geojson'

export interface MapOverlay {
  id: string
  order?: number
  apply(map: MapLibreMap): void | Promise<void>
  dispose?(map: MapLibreMap): void
}

export interface OverlayManager {
  register(overlay: MapOverlay): void
  unregister(id: string): void
  has(id: string): boolean
  refresh(): void
  destroy(): void
}

export const OVERLAY_ORDER = {
  district: 10,
  data: 50,
  analysis: 70,
  tool: 90,
  mask: 200,
} as const

export function upsertGeoJsonSource(map: MapLibreMap, id: string, data: GeoJSON): void {
  const existing = map.getSource(id) as GeoJSONSource | undefined
  if (existing) {
    existing.setData(data)
    return
  }
  map.addSource(id, { type: 'geojson', data })
}

const topLayers = new Set<string>()

export function keepOnTop(layerId: string): void {
  topLayers.add(layerId)
}

function topmostExisting(map: MapLibreMap, exclude: string): string | undefined {
  for (const id of topLayers) {
    if (id !== exclude && map.getLayer(id)) return id
  }
  return undefined
}

export function upsertLayer(map: MapLibreMap, layer: AddLayerObject, beforeId?: string): void {
  if (map.getLayer(layer.id)) return
  const explicit = beforeId && map.getLayer(beforeId) ? beforeId : undefined
  map.addLayer(layer, explicit ?? topmostExisting(map, layer.id))
}

export function removeLayers(map: MapLibreMap, ids: string[]): void {
  for (const id of ids) {
    if (map.getLayer(id)) map.removeLayer(id)
  }
}

export function removeSources(map: MapLibreMap, ids: string[]): void {
  for (const id of ids) {
    if (map.getSource(id)) map.removeSource(id)
  }
}

export function setLayersVisible(map: MapLibreMap, ids: string[], visible: boolean): void {
  for (const id of ids) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
  }
}

// Katman türüne göre opaklık boya özelliği; symbol iki ayrı özellik kullanır.
type PaintProperty = Parameters<MapLibreMap['setPaintProperty']>[1]

const OPACITY_PROPERTIES: Record<string, PaintProperty[]> = {
  fill: ['fill-opacity'],
  line: ['line-opacity'],
  circle: ['circle-opacity', 'circle-stroke-opacity'],
  raster: ['raster-opacity'],
  heatmap: ['heatmap-opacity'],
  'fill-extrusion': ['fill-extrusion-opacity'],
  symbol: ['text-opacity', 'icon-opacity'],
}

export function setLayersOpacity(map: MapLibreMap, ids: string[], opacity: number): void {
  const value = Math.min(1, Math.max(0, opacity))
  for (const id of ids) {
    const layer = map.getLayer(id)
    if (!layer) continue
    for (const property of OPACITY_PROPERTIES[layer.type] ?? []) {
      map.setPaintProperty(id, property, value)
    }
  }
}

export function createOverlayManager(map: MapLibreMap): OverlayManager {
  const overlays = new Map<string, MapOverlay & { seq: number }>()
  let counter = 0
  let destroyed = false
  let styleReady = map.isStyleLoaded()

  const runApply = (overlay: MapOverlay): void => {
    try {
      void Promise.resolve(overlay.apply(map)).catch((error: unknown) => {
        console.error(`Overlay uygulanamadı: ${overlay.id}`, error)
      })
    } catch (error) {
      console.error(`Overlay uygulanamadı: ${overlay.id}`, error)
    }
  }

  const applyAll = (): void => {
    if (destroyed) return
    const ordered = [...overlays.values()].sort(
      (a, b) => (a.order ?? OVERLAY_ORDER.data) - (b.order ?? OVERLAY_ORDER.data) || a.seq - b.seq,
    )
    for (const overlay of ordered) runApply(overlay)
  }

  const onStyleLoad = (): void => {
    styleReady = true
    applyAll()
  }
  map.on('style.load', onStyleLoad)

  return {
    register(overlay) {
      counter += 1
      const entry = { ...overlay, seq: counter }
      overlays.set(overlay.id, entry)
      if (styleReady) runApply(entry)
    },
    unregister(id) {
      const entry = overlays.get(id)
      if (!entry) return
      overlays.delete(id)
      if (entry.dispose && styleReady) entry.dispose(map)
    },
    has: (id) => overlays.has(id),
    refresh: applyAll,
    destroy() {
      destroyed = true
      map.off('style.load', onStyleLoad)
      overlays.clear()
    },
  }
}
