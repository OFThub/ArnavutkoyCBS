// MapLibre haritasını kurar, altlık değişimini uygular ve harita bağlamını tüm arayüze açar.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AttributionControl,
  FullscreenControl,
  GeolocateControl,
  Map as MapLibreMap,
  NavigationControl,
  ScaleControl,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DISTRICT, DISTRICT_BOUNDS } from '../config/district'
import { readMapStateFromLocation } from '../core/mapState'
import { useAppStore } from '../store/appStore'
import { basemapStyle } from './basemap'
import { MapContainerContext, MapContext, type MapContextValue } from './mapContext'
import { createOverlayManager } from './overlays'

const EMPTY_CONTEXT: MapContextValue = { map: null, overlays: null, ready: false }

export function MapProvider({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [context, setContext] = useState<MapContextValue>(EMPTY_CONTEXT)
  const basemap = useAppStore((state) => state.basemap)
  const appliedBasemap = useRef<string | null>(null)

  useEffect(() => {
    if (!container) return

    const store = useAppStore.getState()
    const restored = readMapStateFromLocation()
    if (restored) {
      store.setBasemap(restored.basemap)
      store.setVisibleLayers(restored.layers)
    }

    const initialBasemap = restored?.basemap ?? store.basemap
    appliedBasemap.current = initialBasemap

    const map = new MapLibreMap({
      container,
      style: basemapStyle(initialBasemap),
      center: restored
        ? [restored.lng, restored.lat]
        : [DISTRICT.center[0], DISTRICT.center[1]],
      zoom: restored?.zoom ?? DISTRICT.defaultZoom,
      bearing: restored?.bearing ?? 0,
      pitch: restored?.pitch ?? 0,
      maxZoom: 19,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    })

    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right')
    map.addControl(new GeolocateControl({ trackUserLocation: true }), 'top-right')
    map.addControl(new FullscreenControl(), 'top-right')
    map.addControl(new ScaleControl({ unit: 'metric', maxWidth: 140 }), 'bottom-left')
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right')

    const overlays = createOverlayManager(map)

    if (import.meta.env.DEV) {
      ;(window as unknown as { harita?: MapLibreMap }).harita = map
    }

    const onLoad = (): void => {
      if (!restored) map.fitBounds(DISTRICT_BOUNDS, { padding: 32, duration: 0 })
      setContext({ map, overlays, ready: true })
    }
    map.on('load', onLoad)

    return () => {
      map.off('load', onLoad)
      overlays.destroy()
      map.remove()
      appliedBasemap.current = null
      setContext(EMPTY_CONTEXT)
    }
  }, [container])

  useEffect(() => {
    const map = context.map
    if (!map || !context.ready) return
    if (appliedBasemap.current === basemap) return
    appliedBasemap.current = basemap
    map.setStyle(basemapStyle(basemap), { diff: false })
  }, [basemap, context.map, context.ready])

  return (
    <MapContainerContext.Provider value={setContainer}>
      <MapContext.Provider value={context}>{children}</MapContext.Provider>
    </MapContainerContext.Provider>
  )
}
