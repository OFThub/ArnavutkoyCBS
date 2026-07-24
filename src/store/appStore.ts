// Uygulamanın paylaşılan durumu: oturum rolü, altlık seçimi, açık katmanlar ve etkin analiz.

import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { BasemapId } from '../config/sources'
import type { AnalysisResult, Role } from '../core/types'
import { roleFromSession } from '../lib/supabase'

interface AppState {
  role: Role
  session: Session | null
  basemap: BasemapId
  visibleLayers: string[]
  activeAnalysisId: string | null
  lastResult: AnalysisResult | null
  setSession: (session: Session | null) => void
  setBasemap: (basemap: BasemapId) => void
  toggleLayer: (id: string, visible?: boolean) => void
  setActiveAnalysis: (id: string | null) => void
  setResult: (result: AnalysisResult | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  role: 'public',
  session: null,
  basemap: 'liberty',
  visibleLayers: [],
  activeAnalysisId: null,
  lastResult: null,
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
  setActiveAnalysis: (activeAnalysisId) => set({ activeAnalysisId }),
  setResult: (lastResult) => set({ lastResult }),
}))
