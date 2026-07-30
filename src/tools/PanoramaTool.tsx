// Sokak seviyesi panorama aracı: Mapillary kapsamını harita üzerinde gösterir; token yoksa nedenini açıkça bildirir.

import { useEffect, useRef, useState } from 'react'
import { Alert, Anchor, Modal, Stack, Switch, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import type { Map as MapLibreMap, MapLayerMouseEvent, PointLike } from 'maplibre-gl'
import { useMapContext } from '../map/mapContext'
import { setLayersVisible, upsertLayer } from '../map/overlays'
import type { ToolModule } from './types'

const TOKEN = import.meta.env.VITE_MAPILLARY_TOKEN as string | undefined
const SOURCE_ID = 'mapillary'
const LAYER_ID = 'mapillary-kapsama'
const IMAGE_LAYER_ID = 'mapillary-goruntu'
const HIT_PADDING = 18

function addCoverage(map: MapLibreMap): void {
  if (!TOKEN) return
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'vector',
      tiles: [`https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=${TOKEN}`],
      minzoom: 6,
      maxzoom: 14,
    })
  }
  upsertLayer(map, {
    id: LAYER_ID,
    type: 'line',
    source: SOURCE_ID,
    'source-layer': 'sequence',
    paint: { 'line-color': '#22c55e', 'line-width': 2, 'line-opacity': 0.8 },
  })
  // Görünmez nokta katmanı: çizgiye tıklanınca en yakın görüntüyü bulmak için sorgulanır, ekranda çizilmez.
  upsertLayer(map, {
    id: IMAGE_LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    'source-layer': 'image',
    paint: { 'circle-radius': 6, 'circle-opacity': 0, 'circle-stroke-width': 0 },
  })
}

/** Tıklanan piksele en yakın Mapillary görüntüsünün kimliğini bulur; kapsama seyrekse arama alanını genişletir. */
function nearestImageId(map: MapLibreMap, point: { x: number; y: number }): string | null {
  for (const padding of [HIT_PADDING, HIT_PADDING * 2.5]) {
    const bbox: [PointLike, PointLike] = [
      [point.x - padding, point.y - padding],
      [point.x + padding, point.y + padding],
    ]
    const features = map.queryRenderedFeatures(bbox, { layers: [IMAGE_LAYER_ID] })
    let best: { id: string; distance: number } | null = null
    for (const feature of features) {
      const id = feature.properties?.['id']
      if (id === undefined || id === null) continue
      if (feature.geometry.type !== 'Point') continue
      const projected = map.project(feature.geometry.coordinates as [number, number])
      const distance = Math.hypot(projected.x - point.x, projected.y - point.y)
      if (!best || distance < best.distance) best = { id: String(id), distance }
    }
    if (best) return best.id
  }
  return null
}

function PanoramaPanel() {
  const { map, ready } = useMapContext()
  const [enabled, setEnabled] = useState(true)
  const [imageId, setImageId] = useState<string | null>(null)
  const added = useRef(false)

  useEffect(() => {
    if (!map || !ready || !TOKEN) return
    if (!added.current) {
      addCoverage(map)
      added.current = true
    }
    setLayersVisible(map, [LAYER_ID], enabled)
  }, [map, ready, enabled])

  useEffect(() => {
    if (!map || !ready || !TOKEN) return

    const onClick = (event: MapLayerMouseEvent): void => {
      const id = nearestImageId(map, event.point)
      if (id) {
        setImageId(id)
      } else {
        notifications.show({
          color: 'gray',
          title: 'Panorama',
          message: 'Bu noktada görüntü bulunamadı. Haritayı yakınlaştırıp tekrar deneyin.',
        })
      }
    }
    const onEnter = (): void => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const onLeave = (): void => {
      map.getCanvas().style.cursor = ''
    }

    map.on('click', LAYER_ID, onClick)
    map.on('mouseenter', LAYER_ID, onEnter)
    map.on('mouseleave', LAYER_ID, onLeave)
    return () => {
      map.off('click', LAYER_ID, onClick)
      map.off('mouseenter', LAYER_ID, onEnter)
      map.off('mouseleave', LAYER_ID, onLeave)
      map.getCanvas().style.cursor = ''
    }
  }, [map, ready])

  if (!TOKEN) {
    return (
      <Stack gap="sm">
        <Alert color="yellow" p="xs">
          <Text size="xs">
            Sokak seviyesi panorama Mapillary ücretsiz erişim jetonu gerektirir. `VITE_MAPILLARY_TOKEN`
            tanımlandığında kapsama katmanı ve panorama görüntüleyici etkinleşir.
          </Text>
        </Alert>
        <Anchor href="https://www.mapillary.com/dashboard/developers" target="_blank" size="xs">
          Ücretsiz jeton al
        </Anchor>
      </Stack>
    )
  }

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Yeşil çizgiler Mapillary panorama kapsamını gösterir; bir çizgiye tıklayarak sokak görünümünü
        açın. Kapsama seyrek olabilir.
      </Text>
      <Switch
        size="xs"
        label="Kapsama katmanı"
        checked={enabled}
        onChange={(event) => setEnabled(event.currentTarget.checked)}
      />

      <Modal opened={imageId !== null} onClose={() => setImageId(null)} title="Sokak görünümü" size="lg" centered>
        {imageId ? (
          <iframe
            title="Mapillary sokak görünümü"
            src={`https://www.mapillary.com/embed?image_key=${imageId}&style=photo`}
            style={{ width: '100%', height: 420, border: 0 }}
            allow="fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        ) : null}
      </Modal>
    </Stack>
  )
}

export const panoramaTool: ToolModule = {
  id: 'panorama',
  title: 'Panorama',
  description: 'Mapillary sokak görüntüsü',
  access: 'public',
  Panel: PanoramaPanel,
}
