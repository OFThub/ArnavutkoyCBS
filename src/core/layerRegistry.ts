// Katman modüllerinin kimlik çakışmasına izin vermeyen merkezi kaydı; yeni katman = bir dosya + bir kayıt satırı.

import type { LayerGroup, LayerModule, Role } from './types'
import { canAccess } from './access'

const registry = new Map<string, LayerModule>()

export function registerLayer(layer: LayerModule): LayerModule {
  const existing = registry.get(layer.id)
  if (existing && existing !== layer) {
    throw new Error(`Katman kimliği zaten kayıtlı: ${layer.id}`)
  }
  registry.set(layer.id, layer)
  return layer
}

export function registerLayers(layers: LayerModule[]): void {
  for (const layer of layers) registerLayer(layer)
}

export function getLayer(id: string): LayerModule | undefined {
  return registry.get(id)
}

export function listLayers(role: Role): LayerModule[] {
  return [...registry.values()].filter((layer) => canAccess(role, layer.access))
}

export function listLayersByGroup(role: Role): Map<LayerGroup, LayerModule[]> {
  const grouped = new Map<LayerGroup, LayerModule[]>()
  for (const layer of listLayers(role)) {
    const bucket = grouped.get(layer.group)
    if (bucket) bucket.push(layer)
    else grouped.set(layer.group, [layer])
  }
  return grouped
}

export function clearLayerRegistry(): void {
  registry.clear()
}
