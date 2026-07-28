// Sensör kaynağı: cihazın gerçek GNSS/IMU donanımını dinler veya kaydedilmiş izi tekrar oynatır.

export interface SensorReading {
  konum: { lng: number; lat: number; dogrulukM: number; yukseklikM: number | null; hizMs: number | null } | null
  pusulaDerece: number | null
  jiroskopDereceSaniye: number
  ivmeMs2: number | null
  zaman: number
}

export interface SensorCapability {
  konum: boolean
  yonelim: boolean
  hareket: boolean
}

export type SensorListener = (reading: SensorReading) => void
export type SensorStop = () => void

export function detectCapability(): SensorCapability {
  return {
    konum: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    yonelim: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
    hareket: typeof window !== 'undefined' && 'DeviceMotionEvent' in window,
  }
}

export function isSecureContextReady(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext
}

export async function requestIosPermission(): Promise<boolean> {
  const orientation = window.DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<string>
  }
  if (typeof orientation?.requestPermission !== 'function') return true
  try {
    return (await orientation.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export function startLiveSensors(listener: SensorListener): SensorStop {
  let latest: SensorReading = {
    konum: null,
    pusulaDerece: null,
    jiroskopDereceSaniye: 0,
    ivmeMs2: null,
    zaman: performance.now(),
  }

  const emit = (): void => {
    latest = { ...latest, zaman: performance.now() }
    listener(latest)
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      latest = {
        ...latest,
        konum: {
          lng: position.coords.longitude,
          lat: position.coords.latitude,
          dogrulukM: position.coords.accuracy,
          yukseklikM: position.coords.altitude,
          hizMs: position.coords.speed,
        },
      }
      emit()
    },
    () => emit(),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
  )

  const onOrientation = (event: DeviceOrientationEvent): void => {
    const webkit = (event as unknown as { webkitCompassHeading?: number }).webkitCompassHeading
    const heading = typeof webkit === 'number' ? webkit : event.alpha === null ? null : 360 - event.alpha
    latest = { ...latest, pusulaDerece: heading }
    emit()
  }

  const onMotion = (event: DeviceMotionEvent): void => {
    const acceleration = event.accelerationIncludingGravity
    const rotation = event.rotationRate
    latest = {
      ...latest,
      ivmeMs2: acceleration
        ? Math.hypot(acceleration.x ?? 0, acceleration.y ?? 0, acceleration.z ?? 0)
        : latest.ivmeMs2,
      jiroskopDereceSaniye: rotation?.alpha ?? 0,
    }
    emit()
  }

  window.addEventListener('deviceorientationabsolute', onOrientation as EventListener)
  window.addEventListener('deviceorientation', onOrientation as EventListener)
  window.addEventListener('devicemotion', onMotion as EventListener)

  return () => {
    navigator.geolocation.clearWatch(watchId)
    window.removeEventListener('deviceorientationabsolute', onOrientation as EventListener)
    window.removeEventListener('deviceorientation', onOrientation as EventListener)
    window.removeEventListener('devicemotion', onMotion as EventListener)
  }
}

export function startReplay(
  trace: SensorReading[],
  intervalMs: number,
  listener: SensorListener,
): SensorStop {
  let index = 0
  const timer = window.setInterval(() => {
    const reading = trace[index % trace.length]
    index += 1
    if (reading) listener({ ...reading, zaman: performance.now() })
  }, intervalMs)
  return () => window.clearInterval(timer)
}

export function syntheticTrace(
  centerLng: number,
  centerLat: number,
  count = 120,
): SensorReading[] {
  const trace: SensorReading[] = []
  for (let step = 0; step < count; step += 1) {
    const t = step / count
    const noise = (seed: number): number => Math.sin(seed * 12.9898) * 0.00012
    trace.push({
      konum: {
        lng: centerLng + t * 0.01 + noise(step),
        lat: centerLat + Math.sin(t * Math.PI * 2) * 0.004 + noise(step + 7),
        dogrulukM: 6 + Math.abs(Math.sin(step / 5)) * 14,
        yukseklikM: 120 + Math.sin(t * Math.PI) * 30,
        hizMs: 1.4 + Math.sin(step / 9) * 0.4,
      },
      pusulaDerece: (90 + Math.sin(step / 6) * 25 + Math.sin(step * 3.7) * 6 + 360) % 360,
      jiroskopDereceSaniye: Math.cos(step / 6) * 4,
      ivmeMs2: 9.81 + Math.sin(step / 3) * 0.8,
      zaman: step * 250,
    })
  }
  return trace
}
