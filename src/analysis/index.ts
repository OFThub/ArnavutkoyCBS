// Analiz modüllerinin tek toplanma noktası; her yeni analiz burada bir satırla kaydedilir.

import { registerAnalysis } from '../core/analysisRegistry'
import type { AnalysisModule } from '../core/types'
import { accessibilityAnalysis } from './accessibility'
import { declarationGapAnalysis } from './declarationGap'
import { evacuationAnalysis } from './evacuation'
import { excavationConflictAnalysis } from './excavationConflict'
import { floodRiskAnalysis } from './floodRisk'
import { suitabilityAnalysis } from './suitability'
import { zoningComplianceAnalysis } from './zoningCompliance'

const analyses: AnalysisModule<never>[] = [
  suitabilityAnalysis as unknown as AnalysisModule<never>,
  floodRiskAnalysis as unknown as AnalysisModule<never>,
  accessibilityAnalysis as unknown as AnalysisModule<never>,
  zoningComplianceAnalysis as unknown as AnalysisModule<never>,
  evacuationAnalysis as unknown as AnalysisModule<never>,
  excavationConflictAnalysis as unknown as AnalysisModule<never>,
  declarationGapAnalysis as unknown as AnalysisModule<never>,
]

export function installAnalyses(): void {
  for (const analysis of analyses) registerAnalysis(analysis)
}
