// OSM anlık görüntüsünden etiket filtresiyle katman üreten fabrika; her kent hizmeti katmanı bir config satırı.

import * as turf from '@turf/turf'
import type { AddLayerObject } from 'maplibre-gl'
import type { Feature, FeatureCollection } from 'geojson'
import type { Access, LayerGroup, LayerModule, LegendItem } from '../core/types'
import { snapshotTheme, type SnapshotTheme } from '../data/osmSnapshot'
import { LABEL_FONT } from '../map/basemap'
import { setLayersVisible, upsertGeoJsonSource, upsertLayer } from '../map/overlays'

export type TagFilter = Record<string, string[]>

export interface OsmLayerSpec {
  id: string
  title: string
  group: LayerGroup
  access: Access
  tema: SnapshotTheme
  /** Etiket → kabul edilen değerler. Herhangi bir eşleşme özelliği katmana alır. */
  tags: TagFilter
  shape: 'circle' | 'line' | 'fill'
  color: string
  /** Sınıfa göre renklendirme (imar lejandı gibi); verilmezse düz `color` kullanılır. */
  colorBy?: { field: string; values: Record<string, string> }
  /** Nokta katmanlarında etiket metni için kullanılacak özellik adı. */
  labelField?: string
  minzoom?: number
  legend?: LegendItem[]
}

/**
 * OSM'de aynı gerçek nesne kimi yerde düğüm, kimi yerde kapalı alan olarak işaretlenir —
 * pazar yerlerinin ikisi de poligon. Nokta katmanlarında alanlar ağırlık merkezine indirgenir,
 * yoksa geometri türü filtresi bu kayıtları sessizce düşürür.
 */
export function toPoint(feature: Feature): Feature {
  if (feature.geometry.type === 'Point') return feature
  try {
    const merkez = turf.centroid(feature as Feature<never>)
    return { ...feature, geometry: merkez.geometry }
  } catch {
    return feature
  }
}

export function matchesTags(feature: Feature, tags: TagFilter): boolean {
  const props = feature.properties
  if (!props) return false
  for (const [key, values] of Object.entries(tags)) {
    const value = props[key]
    if (typeof value === 'string' && values.includes(value)) return true
  }
  return false
}

const GEOMETRY_OF: Record<OsmLayerSpec['shape'], string> = {
  circle: 'Point',
  line: 'LineString',
  fill: 'Polygon',
}

function colorExpression(spec: OsmLayerSpec): unknown {
  if (!spec.colorBy) return spec.color
  const match: unknown[] = ['match', ['get', spec.colorBy.field]]
  for (const [value, color] of Object.entries(spec.colorBy.values)) match.push(value, color)
  match.push(spec.color)
  return match
}

function paintFor(shape: OsmLayerSpec['shape'], color: unknown): Record<string, unknown> {
  if (shape === 'circle') {
    return {
      'circle-color': color,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 17, 8],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5,
    }
  }
  if (shape === 'line') {
    return {
      'line-color': color,
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 17, 4],
    }
  }
  return { 'fill-color': color, 'fill-opacity': 0.45, 'fill-outline-color': color }
}

export function osmFeatureLayer(spec: OsmLayerSpec): LayerModule {
  const sourceId = `osm-${spec.id}`
  const mainLayer = `${sourceId}-${spec.shape}`
  const labelLayer = `${sourceId}-etiket`
  const paintLayers = spec.labelField ? [mainLayer, labelLayer] : [mainLayer]

  return {
    id: spec.id,
    title: spec.title,
    group: spec.group,
    access: spec.access,
    paintLayers,
    legend: spec.legend ?? [{ color: spec.color, label: spec.title, shape: spec.shape }],

    async register(map) {
      const collection = await snapshotTheme(spec.tema)
      const eslesen = collection.features.filter((feature) => matchesTags(feature, spec.tags))
      const features = spec.shape === 'circle' ? eslesen.map(toPoint) : eslesen
      const data: FeatureCollection = { type: 'FeatureCollection', features }
      upsertGeoJsonSource(map, sourceId, data)

      // Şekle göre daralan birleşim tipi; `type` çalışma zamanında seçildiği için tek noktada daraltılır.
      upsertLayer(map, {
        id: mainLayer,
        type: spec.shape,
        source: sourceId,
        ...(spec.minzoom !== undefined ? { minzoom: spec.minzoom } : {}),
        // Kapalı alanlar Polygon, açık geometriler LineString olarak gelir; şekil türüne göre süz.
        filter: ['==', ['geometry-type'], GEOMETRY_OF[spec.shape]],
        paint: paintFor(spec.shape, colorExpression(spec)),
      } as AddLayerObject)

      if (spec.labelField) {
        upsertLayer(map, {
          id: labelLayer,
          type: 'symbol',
          source: sourceId,
          minzoom: 15,
          layout: {
            'text-field': ['coalesce', ['get', 'name:tr'], ['get', spec.labelField], ''],
            'text-font': LABEL_FONT,
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, 0.8],
            'text-max-width': 10,
          },
          paint: {
            'text-color': spec.color,
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.4,
          },
        })
      }
    },

    setVisible(map, visible) {
      setLayersVisible(map, paintLayers, visible)
    },
  }
}
