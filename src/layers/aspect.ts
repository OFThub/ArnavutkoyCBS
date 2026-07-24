// Bakı katmanı: yamaç yönünü sekiz ana yöne ayırarak boyar; düz hücreler saydam bırakılır.

import { ASPECT_SECTORS, aspectSector } from '../core/terrain'
import { hexToRgb } from '../map/gridImage'
import { createGridLayer } from './gridLayer'

const COLORS = ASPECT_SECTORS.map((item) => hexToRgb(item.color))

export const aspectLayer = createGridLayer({
  id: 'baki',
  title: 'Bakı (yamaç yönü)',
  opacity: 0.65,
  legend: ASPECT_SECTORS.map((item) => ({ color: item.color, label: item.label, shape: 'fill' })),
  painter: (derived) => {
    const values = derived.aspect
    return (index) => {
      const value = values[index]
      if (value === undefined || value < 0) return null
      const color = COLORS[aspectSector(value)]
      return color ? [color[0], color[1], color[2], 255] : null
    }
  },
})
