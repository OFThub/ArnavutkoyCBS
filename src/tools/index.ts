// Araç modüllerinin tek toplanma noktası; her yeni araç burada bir satırla kaydedilir.

import { registerTools } from './registry'
import { bufferTool } from './BufferTool'
import { coordinateTool } from './CoordinateTool'
import { measureTool } from './MeasureTool'
import { printTool } from './PrintTool'
import { shareTool } from './ShareTool'
import { sketchTool } from './SketchTool'
import { workspaceTool } from './WorkspaceTool'
import type { ToolModule } from './types'

const tools: ToolModule[] = [
  measureTool,
  bufferTool,
  sketchTool,
  coordinateTool,
  shareTool,
  workspaceTool,
  printTool,
]

export function installTools(): void {
  registerTools(tools)
}
