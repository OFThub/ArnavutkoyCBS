// Eğim katmanı: Horn yöntemiyle hesaplanan yüzde eğimi beş imar sınıfına ayırıp boyar.

import { SLOPE_CLASSES, classifySlope } from '../core/terrain'
import { hexToRgb } from '../map/gridImage'
import { createGridLayer } from './gridLayer'

const COLORS = new Map(SLOPE_CLASSES.map((item) => [item.id, hexToRgb(item.color)]))

export const slopeLayer = createGridLayer({
  id: 'egim',
  title: 'Eğim sınıfları',
  opacity: 0.7,
  legend: SLOPE_CLASSES.map((item) => ({ color: item.color, label: item.label, shape: 'fill' })),
  painter: (derived) => {
    const values = derived.slopePercent
    return (index) => {
      const value = values[index]
      if (value === undefined || !Number.isFinite(value)) return null
      const color = COLORS.get(classifySlope(value))
      return color ? [color[0], color[1], color[2], 255] : null
    }
  },
})
