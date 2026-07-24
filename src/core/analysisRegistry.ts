// Analiz modüllerinin merkezi kaydı; sonuçlar ResultPanel tarafından jenerik çizildiği için UI'a dokunulmaz.

import type { AnalysisCategory, AnalysisModule, Role } from './types'
import { canAccess } from './access'

const registry = new Map<string, AnalysisModule<never>>()

export function registerAnalysis<P>(analysis: AnalysisModule<P>): AnalysisModule<P> {
  const stored = analysis as unknown as AnalysisModule<never>
  const existing = registry.get(analysis.id)
  if (existing && existing !== stored) {
    throw new Error(`Analiz kimliği zaten kayıtlı: ${analysis.id}`)
  }
  registry.set(analysis.id, stored)
  return analysis
}

export function getAnalysis(id: string): AnalysisModule<never> | undefined {
  return registry.get(id)
}

export function listAnalyses(role: Role): AnalysisModule<never>[] {
  return [...registry.values()].filter((analysis) => canAccess(role, analysis.access))
}

export function listAnalysesByCategory(role: Role): Map<AnalysisCategory, AnalysisModule<never>[]> {
  const grouped = new Map<AnalysisCategory, AnalysisModule<never>[]>()
  for (const analysis of listAnalyses(role)) {
    const bucket = grouped.get(analysis.category)
    if (bucket) bucket.push(analysis)
    else grouped.set(analysis.category, [analysis])
  }
  return grouped
}

export function defaultParams(analysis: AnalysisModule<never>): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const param of analysis.params) {
    if (param.kind === 'geometry') continue
    values[param.name] = param.default
  }
  return values
}

export function clearAnalysisRegistry(): void {
  registry.clear()
}
