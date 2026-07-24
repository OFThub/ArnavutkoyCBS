// Uygulamanın paylaşılan durumu: oturum rolü, altlık seçimi, açık katmanlar, etkin araç ve çizim taslakları.

import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { Feature } from 'geojson'
import type { BasemapId } from '../config/sources'
import type { AnalysisResult, Role } from '../core/types'
import { roleFromSession } from '../lib/supabase'

export const DEFAULT_VISIBLE_LAYERS = ['ilce-sinir', 'ilce-maske']

interface AppState {
  role: Role
  session: Session | null
  basemap: BasemapId
  visibleLayers: string[]
  activeToolId: string | null
  activeAnalysisId: string | null
  terrain3d: boolean
  terrainExaggeration: number
  contourInterval: number
  lastResult: AnalysisResult | null
  sketch: Feature[]
  setSession: (session: Session | null) => void
  setBasemap: (basemap: BasemapId) => void
  toggleLayer: (id: string, visible?: boolean) => void
  setVisibleLayers: (ids: string[]) => void
  setActiveTool: (id: string | null) => void
  setTerrain3d: (enabled: boolean) => void
  setTerrainExaggeration: (value: number) => void
  setContourInterval: (value: number) => void
  setActiveAnalysis: (id: string | null) => void
  setResult: (result: AnalysisResult | null) => void
  setSketch: (features: Feature[]) => void
  addSketch: (feature: Feature) => void
  removeSketch: (id: string) => void
  clearSketch: () => void
}

export const useAppStore = create<AppState>((set) => ({
  role: 'public',
  session: null,
  basemap: 'liberty',
  visibleLayers: [...DEFAULT_VISIBLE_LAYERS],
  activeToolId: null,
  activeAnalysisId: null,
  terrain3d: false,
  terrainExaggeration: 1.5,
  contourInterval: 10,
  lastResult: null,
  sketch: [],
  setSession: (session) => set({ session, role: roleFromSession(session) }),
  setBasemap: (basemap) => set({ basemap }),
  toggleLayer: (id, visible) =>
    set((state) => {
      const isOn = state.visibleLayers.includes(id)
      const next = visible ?? !isOn
      if (next === isOn) return state
      return {
        visibleLayers: next
          ? [...state.visibleLayers, id]
          : state.visibleLayers.filter((layerId) => layerId !== id),
      }
    }),
  setVisibleLayers: (visibleLayers) => set({ visibleLayers }),
  setActiveTool: (activeToolId) => set({ activeToolId }),
  setTerrain3d: (terrain3d) => set({ terrain3d }),
  setTerrainExaggeration: (terrainExaggeration) => set({ terrainExaggeration }),
  setContourInterval: (contourInterval) => set({ contourInterval }),
  setActiveAnalysis: (activeAnalysisId) => set({ activeAnalysisId }),
  setResult: (lastResult) => set({ lastResult }),
  setSketch: (sketch) => set({ sketch }),
  addSketch: (feature) => set((state) => ({ sketch: [...state.sketch, feature] })),
  removeSketch: (id) =>
    set((state) => ({ sketch: state.sketch.filter((feature) => String(feature.id) !== id) })),
  clearSketch: () => set({ sketch: [] }),
}))
