// IndexedDB tabanlı, sürüm ve TTL farkında kalıcı önbellek; DEM ızgarası ve veri setleri için ortak katman.

import { createStore, get, set, del, clear } from 'idb-keyval'

const store = createStore('arnavutkoy-cbs', 'kv')

interface Envelope<T> {
  version: string
  storedAt: number
  ttlMs: number | null
  value: T
}

function isEnvelope<T>(value: unknown): value is Envelope<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    'storedAt' in value &&
    'value' in value
  )
}

export async function cacheGet<T>(key: string, version: string): Promise<T | undefined> {
  const raw = await get(key, store)
  if (!isEnvelope<T>(raw)) return undefined
  if (raw.version !== version) {
    await del(key, store)
    return undefined
  }
  if (raw.ttlMs !== null && Date.now() - raw.storedAt > raw.ttlMs) {
    await del(key, store)
    return undefined
  }
  return raw.value
}

export async function cacheSet<T>(
  key: string,
  version: string,
  value: T,
  ttlMs: number | null = null,
): Promise<void> {
  const envelope: Envelope<T> = { version, storedAt: Date.now(), ttlMs, value }
  await set(key, envelope, store)
}

export async function cacheDelete(key: string): Promise<void> {
  await del(key, store)
}

export async function cacheClear(): Promise<void> {
  await clear(store)
}

export async function cached<T>(
  key: string,
  version: string,
  ttlMs: number | null,
  produce: () => Promise<T>,
): Promise<T> {
  const hit = await cacheGet<T>(key, version)
  if (hit !== undefined) return hit
  const value = await produce()
  await cacheSet(key, version, value, ttlMs)
  return value
}
