// Bağımsız yükselti servislerinden nokta değeri okur; DEM ızgarasının çapraz doğrulamasında kullanılır.

import { SOURCES } from '../config/sources'

async function readJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, signal ? { signal } : undefined)
  if (!response.ok) throw new Error(`Yükselti servisi yanıt vermedi (${response.status})`)
  return response.json()
}

function firstNumber(value: unknown, key: string): number | null {
  if (typeof value !== 'object' || value === null) return null
  const list = (value as Record<string, unknown>)[key]
  if (!Array.isArray(list)) return null
  const first = list[0]
  if (typeof first === 'number') return first
  if (typeof first === 'object' && first !== null) {
    const nested = (first as Record<string, unknown>)['elevation']
    if (typeof nested === 'number') return nested
  }
  return null
}

export async function openMeteoElevation(
  lng: number,
  lat: number,
  signal?: AbortSignal,
): Promise<number> {
  const url = `${SOURCES.elevationOpenMeteo}?latitude=${lat}&longitude=${lng}`
  const value = firstNumber(await readJson(url, signal), 'elevation')
  if (value === null) throw new Error('Open-Meteo yükselti değeri okunamadı')
  return value
}

export async function openTopoDataElevation(
  lng: number,
  lat: number,
  signal?: AbortSignal,
): Promise<number> {
  const url = `${SOURCES.elevationOpenTopoData}?locations=${lat},${lng}`
  const value = firstNumber(await readJson(url, signal), 'results')
  if (value === null) throw new Error('OpenTopoData yükselti değeri okunamadı')
  return value
}

export async function referenceElevation(
  lng: number,
  lat: number,
  signal?: AbortSignal,
): Promise<{ value: number; source: string }> {
  try {
    return { value: await openMeteoElevation(lng, lat, signal), source: 'Open-Meteo' }
  } catch {
    return { value: await openTopoDataElevation(lng, lat, signal), source: 'OpenTopoData SRTM30m' }
  }
}
