// Adlandırılmış çalışma alanlarının (harita durumu + çizim taslakları) tarayıcı veritabanında saklanması.

import type { Feature } from 'geojson'
import type { MapState } from './mapState'
import { cacheGet, cacheSet } from './storage'

const KEY = 'calisma-alanlari'
const VERSION = 'v1'

export interface Workspace {
  id: string
  name: string
  savedAt: string
  state: MapState
  sketch: Feature[]
}

export async function listWorkspaces(): Promise<Workspace[]> {
  return (await cacheGet<Workspace[]>(KEY, VERSION)) ?? []
}

export async function saveWorkspace(workspace: Workspace): Promise<Workspace[]> {
  const existing = await listWorkspaces()
  const next = [workspace, ...existing.filter((item) => item.id !== workspace.id)]
  await cacheSet(KEY, VERSION, next, null)
  return next
}

export async function deleteWorkspace(id: string): Promise<Workspace[]> {
  const next = (await listWorkspaces()).filter((item) => item.id !== id)
  await cacheSet(KEY, VERSION, next, null)
  return next
}
