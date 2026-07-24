// Harita koordinatına bağlı HTML etiketlerini React portalı üzerinden besleyen işaretçi bileşeni.

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Marker, type PositionAnchor } from 'maplibre-gl'
import { useMapContext } from './mapContext'

interface MapMarkerPortalProps {
  lng: number
  lat: number
  anchor?: PositionAnchor
  children: ReactNode
}

export function MapMarkerPortal({ lng, lat, anchor = 'center', children }: MapMarkerPortalProps) {
  const { map } = useMapContext()
  const element = useMemo(() => document.createElement('div'), [])
  const markerRef = useRef<Marker | null>(null)

  useEffect(() => {
    if (!map) return
    const marker = new Marker({ element, anchor }).setLngLat([lng, lat]).addTo(map)
    markerRef.current = marker
    return () => {
      marker.remove()
      markerRef.current = null
    }
  }, [map, element, anchor])

  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat])
  }, [lng, lat])

  return createPortal(children, element)
}
