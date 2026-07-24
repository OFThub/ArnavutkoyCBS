// Harita örneği, overlay yöneticisi ve harita kapsayıcı elemanını bileşen ağacına taşıyan React bağlamları.

import { createContext, useContext } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { OverlayManager } from './overlays'

export interface MapContextValue {
  map: MapLibreMap | null
  overlays: OverlayManager | null
  ready: boolean
}

export const MapContext = createContext<MapContextValue>({
  map: null,
  overlays: null,
  ready: false,
})

export const MapContainerContext = createContext<(element: HTMLDivElement | null) => void>(() => {})

export function useMapContext(): MapContextValue {
  return useContext(MapContext)
}

export function useMapReady(): { map: MapLibreMap; overlays: OverlayManager } | null {
  const { map, overlays, ready } = useMapContext()
  if (!ready || !map || !overlays) return null
  return { map, overlays }
}
