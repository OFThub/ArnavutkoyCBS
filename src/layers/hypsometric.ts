// Hipsometrik yükselti katmanı: ızgara değerlerini alçaktan yükseğe renk rampasıyla boyar.

import { rampColor } from '../map/gridImage'
import { createGridLayer } from './gridLayer'

const RAMP = [
  { at: 0, color: '#2c7bb6' },
  { at: 0.15, color: '#66bd63' },
  { at: 0.4, color: '#d9ef8b' },
  { at: 0.6, color: '#fdae61' },
  { at: 0.8, color: '#a6611a' },
  { at: 1, color: '#f7f7f7' },
]

export const hypsometricLayer = createGridLayer({
  id: 'hipsometrik',
  title: 'Hipsometrik yükselti',
  opacity: 0.65,
  legend: [
    { color: '#2c7bb6', label: 'En alçak', shape: 'fill' },
    { color: '#d9ef8b', label: 'Orta', shape: 'fill' },
    { color: '#a6611a', label: 'Yüksek', shape: 'fill' },
    { color: '#f7f7f7', label: 'En yüksek', shape: 'fill' },
  ],
  painter: (derived) => {
    const { min, max } = derived.elevation
    const span = max - min
    const data = derived.grid.data
    return (index) => {
      const value = data[index]
      if (value === undefined || !Number.isFinite(value)) return null
      const [r, g, b] = rampColor(RAMP, span > 0 ? (value - min) / span : 0)
      return [r, g, b, 255]
    }
  },
})
