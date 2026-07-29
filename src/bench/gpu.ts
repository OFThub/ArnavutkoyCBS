// GPU ölçümü: haritayı döndürüp gerçek kare sürelerini örnekler; sekme görünür değilse tarayıcı kare hızını kıstığı için ölçümü geçersiz işaretler.

import type { Map as MapLibreMap } from 'maplibre-gl'
import { percentile } from './stats'

export interface GpuResult {
  ortalamaFps: number
  medyanKareMs: number
  p95KareMs: number
  kareSayisi: number
  guvenilir: boolean
  not: string | null
}

const UNRELIABLE_FPS = 5

export async function measureMapFrames(map: MapLibreMap, durationMs = 3000): Promise<GpuResult> {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return {
      ortalamaFps: Number.NaN,
      medyanKareMs: Number.NaN,
      p95KareMs: Number.NaN,
      kareSayisi: 0,
      guvenilir: false,
      not: 'Sekme görünür değil; tarayıcı kare hızını kıstığı için GPU ölçümü yapılmadı.',
    }
  }

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
  const fps = total > 0 ? (usable.length / total) * 1000 : Number.NaN

  const throttled = usable.length < 10 || fps < UNRELIABLE_FPS

  return {
    ortalamaFps: fps,
    medyanKareMs: sorted[Math.floor(sorted.length / 2)] ?? Number.NaN,
    p95KareMs: percentile(usable, 0.95),
    kareSayisi: usable.length,
    guvenilir: !throttled,
    not: throttled
      ? 'Kare hızı kısıtlı görünüyor (sekme arka planda veya pencere gizli). Ölçüm güvenilir değil.'
      : null,
  }
}
