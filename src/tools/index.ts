// Araç modüllerinin tek toplanma noktası; her yeni araç burada bir satırla kaydedilir.

import { registerTools } from './registry'
import { benchmarkTool } from './BenchmarkTool'
import { bufferTool } from './BufferTool'
import { coordinateTool } from './CoordinateTool'
import { fieldTool } from './FieldTool'
import { imarTool } from './ImarTool'
import { importTool } from './ImportTool'
import { inspectorTool } from './InspectorTool'
import { mahalleTool } from './MahalleTool'
import { measureTool } from './MeasureTool'
import { numberingTool } from './NumberingTool'
import { panoramaTool } from './PanoramaTool'
import { printTool } from './PrintTool'
import { profileTool } from './ProfileTool'
import { shareTool } from './ShareTool'
import { sketchTool } from './SketchTool'
import { terrainTool } from './TerrainTool'
import { workspaceTool } from './WorkspaceTool'
import type { ToolModule } from './types'

const tools: ToolModule[] = [
  inspectorTool,
  measureTool,
  bufferTool,
  sketchTool,
  terrainTool,
  profileTool,
  coordinateTool,
  shareTool,
  numberingTool,
  panoramaTool,
  workspaceTool,
  imarTool,
  mahalleTool,
  importTool,
  fieldTool,
  benchmarkTool,
  printTool,
]

export function installTools(): void {
  registerTools(tools)
}
