// Analiz modüllerini ortak bağlamla çalıştırır; veri yükleme, iptal ve hata sarmalamayı tek yerde toplar.

import type { Map as MapLibreMap } from 'maplibre-gl'
import { DISTRICT } from '../config/district'
import { loadDataset } from '../core/dataset'
import type { AnalysisContext, AnalysisModule, AnalysisResult, Role } from '../core/types'

export async function runAnalysis(
  analysis: AnalysisModule<never>,
  map: MapLibreMap,
  role: Role,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  const context: AnalysisContext = {
    map,
    district: DISTRICT,
    role,
    loadDataset: (key) => loadDataset(key),
    ...(signal ? { signal } : {}),
  }
  return analysis.run(context, params as never)
}
