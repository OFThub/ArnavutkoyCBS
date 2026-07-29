// Supabase tablosundan katman üreten fabrika; kurumsal veri yoksa katman kurulmaz ve sebebi bildirilir.

import type { AddLayerObject } from 'maplibre-gl'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { notifications } from '@mantine/notifications'
import { supabase } from '../lib/supabase'
import type { Access, LayerGroup, LayerModule, LegendItem } from '../core/types'
import { LABEL_FONT } from '../map/basemap'
import { setLayersVisible, upsertGeoJsonSource, upsertLayer } from '../map/overlays'

export interface SupabaseLayerSpec {
  id: string
  title: string
  group: LayerGroup
  access: Access
  table: string
  /** PostgREST select ifadesi; `geom` sütununu içermeli. */
  select: string
  shape: 'circle' | 'line' | 'fill'
  color: string
  colorBy?: { field: string; values: Record<string, string> }
  labelField?: string
  /** Satır sayısı üst sınırı; tarayıcıya sığmayacak tabloları korur. */
  limit?: number
  /** `eq` filtresi — ör. yalnızca askıdaki planlar. */
  equals?: { column: string; value: string }
  /** Veri yokken kullanıcıya söylenecek: neyin eksik olduğu ve ne zaman dolacağı. */
  bosMesaj: string
  legend?: LegendItem[]
}

const GEOMETRY_OF: Record<SupabaseLayerSpec['shape'], string> = {
  circle: 'Point',
  line: 'LineString',
  fill: 'Polygon',
}

const DEFAULT_LIMIT = 5000

type Row = Record<string, unknown>

/** PostGIS sütunu GeoJSON olarak gelmezse (hex WKB) sessizce çizmek yerine atlanır. */
export function toGeometry(value: unknown): Geometry | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { type?: unknown; coordinates?: unknown; geometries?: unknown }
  if (typeof candidate.type !== 'string') return null
  if (candidate.coordinates === undefined && candidate.geometries === undefined) return null
  return value as Geometry
}

export function rowsToCollection(rows: Row[]): { collection: FeatureCollection; atlanan: number } {
  const features: Feature[] = []
  let atlanan = 0

  for (const row of rows) {
    const geometry = toGeometry(row['geom'])
    if (!geometry) {
      atlanan += 1
      continue
    }
    const { geom: _geom, ...properties } = row
    features.push({ type: 'Feature', geometry, properties })
  }

  return { collection: { type: 'FeatureCollection', features }, atlanan }
}

function colorExpression(spec: SupabaseLayerSpec): unknown {
  if (!spec.colorBy) return spec.color
  const match: unknown[] = ['match', ['get', spec.colorBy.field]]
  for (const [value, color] of Object.entries(spec.colorBy.values)) match.push(value, color)
  match.push(spec.color)
  return match
}

function paintFor(shape: SupabaseLayerSpec['shape'], color: unknown): Record<string, unknown> {
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
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 17, 5],
    }
  }
  return { 'fill-color': color, 'fill-opacity': 0.5, 'fill-outline-color': '#10151C' }
}

export function supabaseLayer(spec: SupabaseLayerSpec): LayerModule {
  const sourceId = `kurumsal-${spec.id}`
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
      if (!supabase) {
        notifications.show({
          color: 'gray',
          title: spec.title,
          message: `Sunucu bağlantısı yapılandırılmadı. ${spec.bosMesaj}`,
        })
        return
      }

      let query = supabase.from(spec.table).select(spec.select).limit(spec.limit ?? DEFAULT_LIMIT)
      if (spec.equals) query = query.eq(spec.equals.column, spec.equals.value)

      const { data, error } = await query
      if (error) throw new Error(`${spec.title} okunamadı: ${error.message}`)

      // select() dizesi çalışma zamanında geldiği için PostgREST satır tipini çıkaramaz.
      const { collection, atlanan } = rowsToCollection((data ?? []) as unknown as Row[])

      if (collection.features.length === 0) {
        notifications.show({
          color: 'gray',
          title: spec.title,
          message: spec.bosMesaj,
        })
        return
      }

      if (atlanan > 0) {
        notifications.show({
          color: 'yellow',
          title: spec.title,
          message: `${atlanan} kayıt geometrisi okunamadığı için çizilmedi. Sunucuda geometri sütunu GeoJSON olarak sunulmalı.`,
        })
      }

      upsertGeoJsonSource(map, sourceId, collection)

      // Şekle göre daralan birleşim tipi; `type` çalışma zamanında seçildiği için tek noktada daraltılır.
      upsertLayer(map, {
        id: mainLayer,
        type: spec.shape,
        source: sourceId,
        filter: ['==', ['geometry-type'], GEOMETRY_OF[spec.shape]],
        paint: paintFor(spec.shape, colorExpression(spec)),
      } as AddLayerObject)

      if (spec.labelField) {
        upsertLayer(map, {
          id: labelLayer,
          type: 'symbol',
          source: sourceId,
          minzoom: 14,
          layout: {
            'text-field': ['coalesce', ['get', spec.labelField], ''],
            'text-font': LABEL_FONT,
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, 0.8],
            'text-max-width': 12,
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
