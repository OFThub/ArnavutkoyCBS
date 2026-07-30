// Uygulamanın paylaşılan durumu: oturum rolü, altlık seçimi, açık katmanlar, etkin araç ve çizim taslakları.

import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { Feature } from 'geojson'
import type { BasemapId } from '../config/sources'
import type { AnalysisResult, Role } from '../core/types'
import { roleFromSession } from '../lib/supabase'

export const DEFAULT_VISIBLE_LAYERS = [
  'calisma-alani-maske',
  'komsu-ilceler',
  'ilce-maske',
  'ilce-sinir',
]

interface AppState {
  role: Role
  session: Session | null
  basemap: BasemapId
  visibleLayers: string[]
  layerOpacity: Record<string, number>
  activeToolId: string | null
  activeAnalysisId: string | null
  terrain3d: boolean
  building3d: boolean
  terrainExaggeration: number
  contourInterval: number
  lastResult: AnalysisResult | null
  sketch: Feature[]
  devMode: boolean
  setSession: (session: Session | null) => void
  setBasemap: (basemap: BasemapId) => void
  toggleLayer: (id: string, visible?: boolean) => void
  setVisibleLayers: (ids: string[]) => void
  setLayerOpacity: (id: string, opacity: number) => void
  setActiveTool: (id: string | null) => void
  setDevMode: (enabled: boolean) => void
  setTerrain3d: (enabled: boolean) => void
  setBuilding3d: (enabled: boolean) => void
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
  layerOpacity: {},
  activeToolId: null,
  activeAnalysisId: null,
  terrain3d: false,
  building3d: false,
  terrainExaggeration: 1.5,
  contourInterval: 10,
  lastResult: null,
  sketch: [],
  devMode: false,
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
  setLayerOpacity: (id, opacity) =>
    set((state) => ({ layerOpacity: { ...state.layerOpacity, [id]: opacity } })),
  setActiveTool: (activeToolId) => set({ activeToolId }),
  setDevMode: (devMode) => set({ devMode }),
  setTerrain3d: (terrain3d) => set({ terrain3d }),
  setBuilding3d: (building3d) => set({ building3d }),
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
