// public/data altındaki build-time üretilmiş veri setlerini sürüm damgasıyla getirip önbelleğe alır.

import { DATASETS, type DatasetKey } from '../config/sources'
import { cached } from './storage'

export interface DatasetEntry {
  file: string
  count: number
  source: string
  generatedAt: string
}

export interface DataManifest {
  version: string
  generatedAt: string
  district: string
  datasets: Partial<Record<DatasetKey, DatasetEntry>>
}

let manifestPromise: Promise<DataManifest | null> | null = null

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, signal ? { signal } : undefined)
  if (!response.ok) {
    throw new Error(`Veri seti alınamadı (${response.status}): ${url}`)
  }
  return (await response.json()) as T
}

export function loadManifest(): Promise<DataManifest | null> {
  manifestPromise ??= fetchJson<DataManifest>(DATASETS.manifest).catch(() => null)
  return manifestPromise
}

export async function dataVersion(): Promise<string> {
  const manifest = await loadManifest()
  return manifest?.version ?? 'dev'
}

export async function loadDataset<T>(key: DatasetKey, signal?: AbortSignal): Promise<T> {
  const version = await dataVersion()
  return cached<T>(`dataset:${key}`, version, null, () => fetchJson<T>(DATASETS[key], signal))
}

export function resetManifestCache(): void {
  manifestPromise = null
}
