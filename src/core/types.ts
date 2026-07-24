// Katman ve analiz modüllerinin uyması gereken genişletme sözleşmesi ve ortak sonuç tipleri.

import type { Map as MapLibreMap } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import type { DistrictConfig } from '../config/district'
import type { DatasetKey } from '../config/sources'

export type Role = 'public' | 'personel' | 'yonetici'
export type Access = 'public' | 'personel'

export type LayerGroup =
  | 'altlik'
  | 'topografya'
  | 'kent'
  | 'mulkiyet'
  | 'altyapi'
  | 'risk'
  | 'demografi'

export type AnalysisCategory =
  | 'mekansal'
  | 'risk'
  | 'ulasim'
  | 'imar'
  | 'afet'
  | 'idari'

export interface LegendItem {
  color: string
  label: string
  shape?: 'fill' | 'line' | 'circle'
}

export interface LayerStyleSpec {
  type: 'fill' | 'line' | 'circle' | 'symbol' | 'heatmap' | 'fill-extrusion'
  paint?: Record<string, unknown>
  layout?: Record<string, unknown>
}

export interface ChartSeries {
  key: string
  label: string
  color?: string
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'pie'
  xKey: string
  series: ChartSeries[]
  data: Record<string, string | number>[]
}

export interface ThemableField {
  field: string
  label: string
}

export interface LayerModule {
  id: string
  title: string
  group: LayerGroup
  access: Access
  register(map: MapLibreMap): void | Promise<void>
  setVisible(map: MapLibreMap, visible: boolean): void
  themable?: ThemableField[]
  legend?: LegendItem[]
}

export type ParamSpec =
  | {
      kind: 'number'
      name: string
      label: string
      default: number
      min?: number
      max?: number
      step?: number
      unit?: string
    }
  | {
      kind: 'select'
      name: string
      label: string
      default: string
      options: { value: string; label: string }[]
    }
  | { kind: 'boolean'; name: string; label: string; default: boolean }
  | {
      kind: 'geometry'
      name: string
      label: string
      geometry: 'Point' | 'LineString' | 'Polygon'
    }

export interface AnalysisMetric {
  label: string
  value: string | number
  unit?: string
}

export interface AnalysisTable {
  columns: string[]
  rows: (string | number)[][]
}

export interface AnalysisResult {
  summary: string
  metrics: AnalysisMetric[]
  geojson?: FeatureCollection
  style?: LayerStyleSpec
  table?: AnalysisTable
  chart?: ChartSpec
}

export interface AnalysisContext {
  map: MapLibreMap
  district: DistrictConfig
  role: Role
  loadDataset<T>(key: DatasetKey): Promise<T>
  signal?: AbortSignal
}

export interface AnalysisModule<P = Record<string, unknown>> {
  id: string
  title: string
  category: AnalysisCategory
  access: Access
  params: ParamSpec[]
  run(ctx: AnalysisContext, params: P): Promise<AnalysisResult>
}
