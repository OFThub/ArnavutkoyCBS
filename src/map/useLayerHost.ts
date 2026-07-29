// Kayıtlı katman modüllerini haritaya bağlar ve görünürlüklerini uygulama durumuyla eşitler.

import { useEffect, useRef } from 'react'
import { notifications } from '@mantine/notifications'
import { listLayers } from '../core/layerRegistry'
import { useAppStore } from '../store/appStore'
import { useMapContext } from './mapContext'
import { OVERLAY_ORDER, setLayersOpacity } from './overlays'

export function useLayerHost(): void {
  const { map, overlays, ready } = useMapContext()
  const role = useAppStore((state) => state.role)
  const visibleLayers = useAppStore((state) => state.visibleLayers)
  const layerOpacity = useAppStore((state) => state.layerOpacity)
  const visibleRef = useRef(visibleLayers)
  visibleRef.current = visibleLayers
  const opacityRef = useRef(layerOpacity)
  opacityRef.current = layerOpacity

  const attached = useRef(new Set<string>())

  useEffect(() => {
    const registered = attached.current
    return () => {
      for (const id of registered) overlays?.unregister(`katman:${id}`)
      registered.clear()
    }
  }, [map, overlays, ready, role])

  useEffect(() => {
    if (!map || !overlays || !ready) return

    for (const module of listLayers(role)) {
      const visible = visibleLayers.includes(module.id)

      if (!attached.current.has(module.id)) {
        if (!visible) continue
        attached.current.add(module.id)
        overlays.register({
          id: `katman:${module.id}`,
          order: module.order ?? OVERLAY_ORDER.data,
          apply: async (target) => {
            try {
              await module.register(target)
              module.setVisible(target, visibleRef.current.includes(module.id))
              const opacity = opacityRef.current[module.id]
              if (module.paintLayers && opacity !== undefined) {
                setLayersOpacity(target, module.paintLayers, opacity)
              }
            } catch (error) {
              notifications.show({
                color: 'red',
                title: module.title,
                message: error instanceof Error ? error.message : 'Katman yüklenemedi',
              })
            }
          },
        })
        continue
      }

      module.setVisible(map, visible)
    }
  }, [map, overlays, ready, role, visibleLayers])

  // Kaydırıcı değişimi: yalnızca boya özelliğini günceller, katmanı yeniden kurmaz.
  useEffect(() => {
    if (!map || !ready) return
    for (const module of listLayers(role)) {
      const opacity = layerOpacity[module.id]
      if (!module.paintLayers || opacity === undefined) continue
      setLayersOpacity(map, module.paintLayers, opacity)
    }
  }, [map, ready, role, layerOpacity])
}
