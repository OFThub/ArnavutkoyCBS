// Çalışılan cihazın donanım künyesi: CPU çekirdeği, bellek, GPU sürücü kimliği, ekran ve platform bilgisi.

export interface DeviceProfile {
  cekirdek: number | null
  bellekGb: number | null
  gpuUretici: string | null
  gpuModel: string | null
  webglSurum: string | null
  ekran: string
  pikselOrani: number
  platform: string
  tarayici: string
  jsYiginiSinirMb: number | null
  zaman: string
}

interface MemoryInfo {
  jsHeapSizeLimit?: number
}

function webglInfo(): { uretici: string | null; model: string | null; surum: string | null } {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null)
    if (!gl) return { uretici: null, model: null, surum: null }

    const debug = gl.getExtension('WEBGL_debug_renderer_info')
    const uretici = debug ? String(gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)) : null
    const model = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null
    const surum = String(gl.getParameter(gl.VERSION))

    const lose = gl.getExtension('WEBGL_lose_context')
    lose?.loseContext()

    return { uretici, model, surum }
  } catch {
    return { uretici: null, model: null, surum: null }
  }
}

export function readDeviceProfile(): DeviceProfile {
  const gpu = webglInfo()
  const memory = (performance as unknown as { memory?: MemoryInfo }).memory
  const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory

  return {
    cekirdek: navigator.hardwareConcurrency ?? null,
    bellekGb: typeof deviceMemory === 'number' ? deviceMemory : null,
    gpuUretici: gpu.uretici,
    gpuModel: gpu.model,
    webglSurum: gpu.surum,
    ekran: `${window.screen.width}×${window.screen.height}`,
    pikselOrani: window.devicePixelRatio,
    platform:
      (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
      navigator.platform ??
      'bilinmiyor',
    tarayici: navigator.userAgent,
    jsYiginiSinirMb: memory?.jsHeapSizeLimit
      ? Math.round(memory.jsHeapSizeLimit / (1024 * 1024))
      : null,
    zaman: new Date().toISOString(),
  }
}

export function maxWorkers(): number {
  return Math.max(1, Math.min(navigator.hardwareConcurrency ?? 1, 16))
}

export function workerLadder(): number[] {
  const top = maxWorkers()
  const steps: number[] = []
  for (let count = 1; count <= top; count *= 2) steps.push(count)
  if (steps[steps.length - 1] !== top) steps.push(top)
  return steps
}
