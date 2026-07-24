// Türetilmiş yükselti ızgaralarını katman modülüne dönüştüren ortak fabrika; her tematik raster tek satırla tanımlanır.

import { loadTerrainDerived, type TerrainDerived } from '../data/terrainDerived'
import type { LayerModule, LegendItem } from '../core/types'
import { setLayersVisible } from '../map/overlays'
import { gridImageUrl, upsertGridImage, type PixelPainter } from '../map/gridImage'

export interface GridLayerOptions {
  id: string
  title: string
  legend?: LegendItem[]
  opacity: number
  painter: (derived: TerrainDerived) => PixelPainter
}

export function createGridLayer(options: GridLayerOptions): LayerModule {
  let urlPromise: Promise<{ url: string; derived: TerrainDerived }> | null = null

  const prepare = async (): Promise<{ url: string; derived: TerrainDerived }> => {
    urlPromise ??= (async () => {
      const derived = await loadTerrainDerived()
      return { url: gridImageUrl(derived.grid, options.painter(derived)), derived }
    })().catch((error: unknown) => {
      urlPromise = null
      throw error
    })
    return urlPromise
  }

  return {
    id: options.id,
    title: options.title,
    group: 'topografya',
    access: 'public',
    ...(options.legend ? { legend: options.legend } : {}),

    async register(map) {
      const { url, derived } = await prepare()
      upsertGridImage(map, options.id, derived.grid, url, options.opacity)
    },

    setVisible(map, visible) {
      setLayersVisible(map, [`${options.id}-goruntu`], visible)
    },
  }
}
