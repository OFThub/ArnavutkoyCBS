// Araç modüllerinin kimlik çakışmasına izin vermeyen merkezi kaydı; yeni araç = bir dosya + bir kayıt satırı.

import { canAccess } from '../core/access'
import type { Role } from '../core/types'
import type { ToolModule } from './types'

const registry = new Map<string, ToolModule>()

export function registerTool(tool: ToolModule): ToolModule {
  const existing = registry.get(tool.id)
  if (existing && existing !== tool) {
    throw new Error(`Araç kimliği zaten kayıtlı: ${tool.id}`)
  }
  registry.set(tool.id, tool)
  return tool
}

export function registerTools(tools: ToolModule[]): void {
  for (const tool of tools) registerTool(tool)
}

export function getTool(id: string): ToolModule | undefined {
  return registry.get(id)
}

export function listTools(role: Role): ToolModule[] {
  return [...registry.values()].filter((tool) => canAccess(role, tool.access))
}

export function clearToolRegistry(): void {
  registry.clear()
}
