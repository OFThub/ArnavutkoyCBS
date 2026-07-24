// Kaydedilmiş çizim taslaklarını etkin araçtan bağımsız olarak harita üzerinde tutar.

import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import { useMapContext } from './mapContext'
import { OVERLAY_ORDER } from './overlays'
import { createResultOverlay, type ResultOverlayHandle } from './resultOverlay'

export const SKETCH_COLOR = '#f59e0b'

export function useSketchOverlay(): void {
  const { map, overlays, ready } = useMapContext()
  const sketch = useAppStore((state) => state.sketch)
  const handleRef = useRef<ResultOverlayHandle | null>(null)

  useEffect(() => {
    if (!map || !overlays || !ready) return
    const handle = createResultOverlay(map, overlays, 'taslak', SKETCH_COLOR, OVERLAY_ORDER.analysis)
    handle.setData({ type: 'FeatureCollection', features: useAppStore.getState().sketch })
    handleRef.current = handle
    return () => {
      handle.destroy()
      handleRef.current = null
    }
  }, [map, overlays, ready])

  useEffect(() => {
    handleRef.current?.setData({ type: 'FeatureCollection', features: sketch })
  }, [sketch])
}
