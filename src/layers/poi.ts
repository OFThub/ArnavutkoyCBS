// Önemli nokta katmanı: hastane, okul, güvenlik, yönetim, ibadet ve yeşil alan POI'lerini kategoriye göre renklendirir.

import type { LayerModule } from '../core/types'
import { LABEL_FONT } from '../map/basemap'
import { setLayersVisible, upsertLayer } from '../map/overlays'
import { ensureVectorSource, VECTOR_SOURCE_ID } from '../map/vectorSource'

const CIRCLE_LAYER = 'poi-daire'
const LABEL_LAYER = 'poi-etiket'

export interface PoiCategory {
  id: string
  label: string
  color: string
  classes: string[]
}

export const POI_CATEGORIES: PoiCategory[] = [
  {
    id: 'saglik',
    label: 'Sağlık',
    color: '#e11d48',
    classes: ['hospital', 'pharmacy', 'doctors', 'clinic', 'dentist', 'veterinary'],
  },
  {
    id: 'egitim',
    label: 'Eğitim',
    color: '#2563eb',
    classes: ['school', 'college', 'kindergarten', 'library'],
  },
  { id: 'guvenlik', label: 'Güvenlik', color: '#7c3aed', classes: ['police', 'fire_station'] },
  {
    id: 'yonetim',
    label: 'Kamu yönetimi',
    color: '#0f766e',
    classes: ['town_hall', 'post', 'courthouse'],
  },
  { id: 'ibadet', label: 'İbadet yeri', color: '#a16207', classes: ['place_of_worship'] },
  {
    id: 'yesil',
    label: 'Park ve spor',
    color: '#16a34a',
    classes: ['park', 'garden', 'playground', 'pitch', 'stadium', 'swimming'],
  },
]

const ALL_CLASSES = POI_CATEGORIES.flatMap((item) => item.classes)

export function poiCategoryOf(className: string | undefined): PoiCategory | null {
  if (!className) return null
  return POI_CATEGORIES.find((item) => item.classes.includes(className)) ?? null
}

const COLOR_MATCH: unknown[] = ['match', ['get', 'class']]
for (const category of POI_CATEGORIES) COLOR_MATCH.push(category.classes, category.color)
COLOR_MATCH.push('#64748b')

export const poiLayer: LayerModule = {
  id: 'poi',
  title: 'Önemli noktalar',
  group: 'kent',
  access: 'public',
  legend: POI_CATEGORIES.map((item) => ({
    color: item.color,
    label: item.label,
    shape: 'circle',
  })),

  register(map) {
    ensureVectorSource(map)
    upsertLayer(map, {
      id: CIRCLE_LAYER,
      type: 'circle',
      source: VECTOR_SOURCE_ID,
      'source-layer': 'poi',
      minzoom: 11,
      filter: ['in', ['get', 'class'], ['literal', ALL_CLASSES]],
      paint: {
        'circle-color': COLOR_MATCH as never,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 7],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
      },
    })
    upsertLayer(map, {
      id: LABEL_LAYER,
      type: 'symbol',
      source: VECTOR_SOURCE_ID,
      'source-layer': 'poi',
      minzoom: 14,
      filter: ['in', ['get', 'class'], ['literal', ALL_CLASSES]],
      layout: {
        'text-field': ['coalesce', ['get', 'name:tr'], ['get', 'name']],
        'text-font': LABEL_FONT,
        'text-size': 11,
        'text-anchor': 'top',
        'text-offset': [0, 0.7],
        'text-max-width': 9,
      },
      paint: { 'text-color': '#1f2937', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 },
    })
  },

  setVisible(map, visible) {
    setLayersVisible(map, [CIRCLE_LAYER, LABEL_LAYER], visible)
  },
}
