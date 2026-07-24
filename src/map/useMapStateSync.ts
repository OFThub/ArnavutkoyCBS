// Harita görünümü, altlık ve açık katman değişimlerini adres çubuğundaki kalıcı bağlantıya yansıtır.

import { useEffect } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { readMapStateFromLocation, writeMapStateToLocation, type MapState } from '../core/mapState'
import { useAppStore } from '../store/appStore'
import { useMapContext } from './mapContext'

export function currentMapState(map: MapLibreMap): MapState {
  const center = map.getCenter()
  const { basemap, visibleLayers } = useAppStore.getState()
  return {
    lng: center.lng,
    lat: center.lat,
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
    basemap,
    layers: visibleLayers,
  }
}

export function useMapStateSync(): void {
  const { map, ready } = useMapContext()
  const basemap = useAppStore((state) => state.basemap)
  const visibleLayers = useAppStore((state) => state.visibleLayers)

  useEffect(() => {
    if (!map || !ready) return
    const write = (): void => writeMapStateToLocation(currentMapState(map))
    write()
    map.on('moveend', write)
    return () => {
      map.off('moveend', write)
    }
  }, [map, ready, basemap, visibleLayers])

  useEffect(() => {
    if (!map || !ready) return
    const restore = (): void => {
      const next = readMapStateFromLocation()
      if (!next) return
      const store = useAppStore.getState()
      store.setBasemap(next.basemap)
      store.setVisibleLayers(next.layers)
      map.jumpTo({
        center: [next.lng, next.lat],
        zoom: next.zoom,
        bearing: next.bearing,
        pitch: next.pitch,
      })
    }
    window.addEventListener('hashchange', restore)
    return () => window.removeEventListener('hashchange', restore)
  }, [map, ready])
}
