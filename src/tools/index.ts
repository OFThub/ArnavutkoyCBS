// Araç modüllerinin tek toplanma noktası; her yeni araç burada bir satırla kaydedilir.

import { registerTools } from './registry'
import { bufferTool } from './BufferTool'
import { coordinateTool } from './CoordinateTool'
import { inspectorTool } from './InspectorTool'
import { measureTool } from './MeasureTool'
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
  workspaceTool,
  printTool,
]

export function installTools(): void {
  registerTools(tools)
}
