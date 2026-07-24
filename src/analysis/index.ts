// Analiz modüllerinin tek toplanma noktası; her yeni analiz burada bir satırla kaydedilir.

import { registerAnalysis } from '../core/analysisRegistry'
import type { AnalysisModule } from '../core/types'

const analyses: AnalysisModule<never>[] = []

export function installAnalyses(): void {
  for (const analysis of analyses) registerAnalysis(analysis)
}
