// Bina katmanının 2B dolgu / 3B kütle kipini uygulama durumundan haritaya uygular.

import { useEffect } from 'react'
import { buildingsLayer } from '../layers/buildings'
import { useAppStore } from '../store/appStore'
import { useMapContext } from './mapContext'

export function useBuildingSync(): void {
  const { map, ready } = useMapContext()
  const building3d = useAppStore((state) => state.building3d)
  const visibleLayers = useAppStore((state) => state.visibleLayers)

  useEffect(() => {
    if (!map || !ready) return
    buildingsLayer.setVisible(map, visibleLayers.includes(buildingsLayer.id))
  }, [map, ready, building3d, visibleLayers])
}
