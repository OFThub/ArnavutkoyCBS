// Tıklayarak nokta, çizgi ve alan geometrisi yakalayan; köşeleri sürükleyerek düzenlemeye izin veren çizim oturumu.

import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import type { Feature, FeatureCollection, LineString, Point, Polygon, Position } from 'geojson'
import {
  OVERLAY_ORDER,
  removeLayers,
  removeSources,
  upsertGeoJsonSource,
  upsertLayer,
  type OverlayManager,
} from './overlays'

export type DrawMode = 'point' | 'line' | 'polygon'
export type DrawGeometry = Point | LineString | Polygon
export type DrawFeature = Feature<DrawGeometry>
export type LngLatPair = [number, number]

export function toPair(position: Position): LngLatPair | null {
  const [lng, lat] = position
  return typeof lng === 'number' && typeof lat === 'number' ? [lng, lat] : null
}

export interface DrawSessionOptions {
  mode: DrawMode
  color?: string
  onChange?: (feature: DrawFeature | null, vertexCount: number) => void
  onFinish?: (feature: DrawFeature | null) => void
}

export interface DrawSession {
  finish(): void
  undo(): void
  reset(): void
  destroy(): void
}

const SOURCE_ID = 'cizim'
const FILL_LAYER = 'cizim-alan'
const LINE_LAYER = 'cizim-cizgi'
const VERTEX_LAYER = 'cizim-nokta'
const CLOSE_PIXELS = 6

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

export function startDrawSession(
  map: MapLibreMap,
  overlays: OverlayManager,
  options: DrawSessionOptions,
): DrawSession {
  const color = options.color ?? '#0d9488'
  let vertices: LngLatPair[] = []
  let hover: LngLatPair | null = null
  let finished = false
  let dragIndex: number | null = null
  let data: FeatureCollection = EMPTY

  const previewGeometry = (points: LngLatPair[]): DrawGeometry | null => {
    const first = points[0]
    if (!first) return null
    if (options.mode === 'point') return { type: 'Point', coordinates: first }
    if (points.length < 2) return null
    if (options.mode === 'line') return { type: 'LineString', coordinates: points }
    if (points.length < 3) return { type: 'LineString', coordinates: points }
    return { type: 'Polygon', coordinates: [[...points, first]] }
  }

  const resultFeature = (): DrawFeature | null => {
    const geometry = previewGeometry(vertices)
    if (!geometry) return null
    if (options.mode === 'polygon' && geometry.type !== 'Polygon') return null
    return { type: 'Feature', geometry, properties: { tur: options.mode } }
  }

  const render = (notify: boolean): void => {
    const points = !finished && hover && options.mode !== 'point' ? [...vertices, hover] : vertices
    const geometry = previewGeometry(points)
    const features: Feature[] = []
    if (geometry && geometry.type !== 'Point') {
      features.push({ type: 'Feature', geometry, properties: {} })
    }
    vertices.forEach((position, index) => {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: position },
        properties: { index },
      })
    })
    data = { type: 'FeatureCollection', features }
    if (map.isStyleLoaded()) upsertGeoJsonSource(map, SOURCE_ID, data)
    if (notify) options.onChange?.(resultFeature(), vertices.length)
  }

  const apply = (target: MapLibreMap): void => {
    upsertGeoJsonSource(target, SOURCE_ID, data)
    upsertLayer(target, {
      id: FILL_LAYER,
      type: 'fill',
      source: SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': color, 'fill-opacity': 0.18 },
    })
    upsertLayer(target, {
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE_ID,
      filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]],
      paint: { 'line-color': color, 'line-width': 2.5 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })
    upsertLayer(target, {
      id: VERTEX_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 5,
        'circle-color': '#ffffff',
        'circle-stroke-color': color,
        'circle-stroke-width': 2,
      },
    })
  }

  const dispose = (target: MapLibreMap): void => {
    removeLayers(target, [FILL_LAYER, LINE_LAYER, VERTEX_LAYER])
    removeSources(target, [SOURCE_ID])
  }

  const samePixel = (a: LngLatPair, b: LngLatPair): boolean => {
    const first = map.project(a)
    const second = map.project(b)
    return Math.hypot(first.x - second.x, first.y - second.y) < CLOSE_PIXELS
  }

  const finish = (): void => {
    if (finished) return
    if (options.mode !== 'point' && vertices.length >= 2) {
      const last = vertices[vertices.length - 1]
      const previous = vertices[vertices.length - 2]
      if (last && previous && samePixel(last, previous)) vertices = vertices.slice(0, -1)
    }
    finished = true
    hover = null
    render(true)
    options.onFinish?.(resultFeature())
  }

  const onClick = (event: MapMouseEvent): void => {
    if (finished || dragIndex !== null) return
    vertices = [...vertices, [event.lngLat.lng, event.lngLat.lat]]
    render(true)
    if (options.mode === 'point') finish()
  }

  const onMouseMove = (event: MapMouseEvent): void => {
    if (dragIndex !== null) {
      vertices = vertices.map((position, index) =>
        index === dragIndex ? [event.lngLat.lng, event.lngLat.lat] : position,
      )
      render(true)
      return
    }
    if (finished || vertices.length === 0) return
    hover = [event.lngLat.lng, event.lngLat.lat]
    render(false)
  }

  const onDoubleClick = (event: MapMouseEvent): void => {
    event.preventDefault()
    finish()
  }

  const onContextMenu = (event: MapMouseEvent): void => {
    event.preventDefault()
    finish()
  }

  const onVertexDown = (event: MapMouseEvent): void => {
    const feature = map.queryRenderedFeatures(event.point, { layers: [VERTEX_LAYER] })[0]
    const index = feature?.properties?.index
    if (typeof index !== 'number') return
    event.preventDefault()
    dragIndex = index
    map.dragPan.disable()
    map.getCanvas().style.cursor = 'grabbing'
  }

  const onMouseUp = (): void => {
    if (dragIndex === null) return
    dragIndex = null
    map.dragPan.enable()
    map.getCanvas().style.cursor = finished ? '' : 'crosshair'
    if (finished) options.onFinish?.(resultFeature())
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') finish()
    else if (event.key === 'Escape') reset()
    else if (event.key === 'Backspace') undo()
    else return
    event.preventDefault()
  }

  const undo = (): void => {
    if (vertices.length === 0) return
    vertices = vertices.slice(0, -1)
    finished = false
    render(true)
  }

  const reset = (): void => {
    vertices = []
    hover = null
    finished = false
    map.getCanvas().style.cursor = 'crosshair'
    render(true)
    options.onFinish?.(null)
  }

  overlays.register({ id: SOURCE_ID, order: OVERLAY_ORDER.tool, apply, dispose })

  map.doubleClickZoom.disable()
  map.getCanvas().style.cursor = 'crosshair'
  map.on('click', onClick)
  map.on('mousemove', onMouseMove)
  map.on('dblclick', onDoubleClick)
  map.on('contextmenu', onContextMenu)
  map.on('mousedown', VERTEX_LAYER, onVertexDown)
  map.on('mouseup', onMouseUp)
  window.addEventListener('keydown', onKeyDown)

  render(false)

  return {
    finish,
    undo,
    reset,
    destroy() {
      map.off('click', onClick)
      map.off('mousemove', onMouseMove)
      map.off('dblclick', onDoubleClick)
      map.off('contextmenu', onContextMenu)
      map.off('mousedown', VERTEX_LAYER, onVertexDown)
      map.off('mouseup', onMouseUp)
      window.removeEventListener('keydown', onKeyDown)
      map.doubleClickZoom.enable()
      map.dragPan.enable()
      map.getCanvas().style.cursor = ''
      overlays.unregister(SOURCE_ID)
    },
  }
}
