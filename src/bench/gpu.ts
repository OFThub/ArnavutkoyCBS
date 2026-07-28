// GPU ölçümü: haritayı sürekli döndürüp gerçek kare sürelerini örnekler, saniyedeki kare ve p95 gecikmeyi verir.

import type { Map as MapLibreMap } from 'maplibre-gl'
import { percentile } from './stats'

export interface GpuResult {
  ortalamaFps: number
  medyanKareMs: number
  p95KareMs: number
  kareSayisi: number
}

export async function measureMapFrames(map: MapLibreMap, durationMs = 3000): Promise<GpuResult> {
  const frames: number[] = []
  const startBearing = map.getBearing()

  await new Promise<void>((resolve) => {
    let previous = performance.now()
    const started = previous

    const step = (): void => {
      const now = performance.now()
      frames.push(now - previous)
      previous = now

      map.setBearing(((now - started) / 20) % 360)
      map.triggerRepaint()

      if (now - started >= durationMs) {
        resolve()
        return
      }
      requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  })

  map.setBearing(startBearing)

  const usable = frames.slice(1)
  const total = usable.reduce((sum, value) => sum + value, 0)
  const sorted = [...usable].sort((a, b) => a - b)
  const middle = sorted[Math.floor(sorted.length / 2)] ?? Number.NaN

  return {
    ortalamaFps: total > 0 ? (usable.length / total) * 1000 : Number.NaN,
    medyanKareMs: middle,
    p95KareMs: percentile(usable, 0.95),
    kareSayisi: usable.length,
  }
}
