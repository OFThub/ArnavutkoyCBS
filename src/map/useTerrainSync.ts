// 3B arazi anahtarını ve yükseklik abartısını uygulama durumundan haritaya uygular.

import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { useMapContext } from './mapContext'
import { applyTerrain } from './terrainSource'

export function useTerrainSync(): void {
  const { map, ready } = useMapContext()
  const terrain3d = useAppStore((state) => state.terrain3d)
  const exaggeration = useAppStore((state) => state.terrainExaggeration)

  useEffect(() => {
    if (!map || !ready) return
    applyTerrain(map, terrain3d, exaggeration)

    const reapply = (): void => applyTerrain(map, terrain3d, exaggeration)
    map.on('style.load', reapply)
    return () => {
      map.off('style.load', reapply)
    }
  }, [map, ready, terrain3d, exaggeration])
}
