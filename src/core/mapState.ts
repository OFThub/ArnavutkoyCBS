// Harita durumunun (görünüm, altlık, açık katmanlar) kalıcı bağlantıda kodlanması ve geri çözülmesi.

import { BASEMAPS, type BasemapId } from '../config/sources'

export interface MapViewState {
  lng: number
  lat: number
  zoom: number
  bearing: number
  pitch: number
}

export interface MapState extends MapViewState {
  basemap: BasemapId
  layers: string[]
}

function isBasemapId(value: string): value is BasemapId {
  return Object.prototype.hasOwnProperty.call(BASEMAPS, value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function encodeMapState(state: MapState): string {
  const view = [
    state.zoom.toFixed(2),
    state.lat.toFixed(5),
    state.lng.toFixed(5),
    state.bearing.toFixed(0),
    state.pitch.toFixed(0),
  ].join('/')

  const parts = [`map=${view}`, `b=${state.basemap}`]
  if (state.layers.length > 0) parts.push(`l=${state.layers.join(',')}`)
  return parts.join('&')
}

export function decodeMapState(hash: string): MapState | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (raw.length === 0) return null

  const params = new URLSearchParams(raw)
  const view = params.get('map')
  if (!view) return null

  const pieces = view.split('/')
  if (pieces.length !== 5) return null

  const [zoom, lat, lng, bearing, pitch] = pieces.map(Number)
  if (![zoom, lat, lng, bearing, pitch].every(Number.isFinite)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null

  const basemap = params.get('b') ?? 'liberty'
  const layers = params.get('l')

  return {
    zoom: clamp(zoom, 0, 24),
    lat,
    lng,
    bearing: ((bearing % 360) + 360) % 360,
    pitch: clamp(pitch, 0, 85),
    basemap: isBasemapId(basemap) ? basemap : 'liberty',
    layers: layers ? layers.split(',').filter((id) => id.length > 0) : [],
  }
}

export function readMapStateFromLocation(): MapState | null {
  if (typeof window === 'undefined') return null
  return decodeMapState(window.location.hash)
}

export function writeMapStateToLocation(state: MapState): void {
  if (typeof window === 'undefined') return
  const hash = `#${encodeMapState(state)}`
  if (window.location.hash === hash) return
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
}

export function shareUrl(state: MapState): string {
  if (typeof window === 'undefined') return ''
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}#${encodeMapState(state)}`
}
