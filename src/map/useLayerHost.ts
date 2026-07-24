// Kayıtlı katman modüllerini haritaya bağlar ve görünürlüklerini uygulama durumuyla eşitler.

import { useEffect, useRef } from 'react'
import { notifications } from '@mantine/notifications'
import { listLayers } from '../core/layerRegistry'
import { useAppStore } from '../store/appStore'
import { useMapContext } from './mapContext'
import { OVERLAY_ORDER } from './overlays'

export function useLayerHost(): void {
  const { map, overlays, ready } = useMapContext()
  const role = useAppStore((state) => state.role)
  const visibleLayers = useAppStore((state) => state.visibleLayers)
  const visibleRef = useRef(visibleLayers)
  visibleRef.current = visibleLayers

  useEffect(() => {
    if (!map || !overlays || !ready) return
    const modules = listLayers(role)

    for (const module of modules) {
      overlays.register({
        id: `katman:${module.id}`,
        order: OVERLAY_ORDER.data,
        apply: async (target) => {
          try {
            await module.register(target)
            module.setVisible(target, visibleRef.current.includes(module.id))
          } catch (error) {
            notifications.show({
              color: 'red',
              title: module.title,
              message: error instanceof Error ? error.message : 'Katman yüklenemedi',
            })
          }
        },
      })
    }

    return () => {
      for (const module of modules) overlays.unregister(`katman:${module.id}`)
    }
  }, [map, overlays, ready, role])

  useEffect(() => {
    if (!map || !ready) return
    for (const module of listLayers(role)) {
      module.setVisible(map, visibleLayers.includes(module.id))
    }
  }, [map, ready, role, visibleLayers])
}
