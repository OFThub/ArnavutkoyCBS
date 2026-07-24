// Topografik konum katmanı: TPI ve eğimden vadi, yamaç, düzlük ve sırt sınıflarını üretip boyar.

import { TERRAIN_CLASSES, classifyTerrain } from '../core/terrain'
import { hexToRgb } from '../map/gridImage'
import { createGridLayer } from './gridLayer'

const COLORS = new Map(
  Object.entries(TERRAIN_CLASSES).map(([id, item]) => [id, hexToRgb(item.color)]),
)

export const terrainClassLayer = createGridLayer({
  id: 'topografik-konum',
  title: 'Topografik konum (TPI)',
  opacity: 0.65,
  legend: Object.values(TERRAIN_CLASSES).map((item) => ({
    color: item.color,
    label: item.label,
    shape: 'fill',
  })),
  painter: (derived) => {
    const { tpi, slopeDegrees, tpiStdDev } = derived
    return (index) => {
      const value = tpi[index]
      const slope = slopeDegrees[index]
      if (value === undefined || slope === undefined) return null
      const color = COLORS.get(classifyTerrain(value, tpiStdDev, slope))
      return color ? [color[0], color[1], color[2], 255] : null
    }
  },
})
