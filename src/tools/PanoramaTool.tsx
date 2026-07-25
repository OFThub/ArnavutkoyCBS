// Sokak seviyesi panorama aracı: Mapillary kapsamını harita üzerinde gösterir; token yoksa nedenini açıkça bildirir.

import { useEffect, useRef, useState } from 'react'
import { Alert, Anchor, Stack, Switch, Text } from '@mantine/core'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useMapContext } from '../map/mapContext'
import { setLayersVisible, upsertLayer } from '../map/overlays'
import type { ToolModule } from './types'

const TOKEN = import.meta.env.VITE_MAPILLARY_TOKEN as string | undefined
const SOURCE_ID = 'mapillary'
const LAYER_ID = 'mapillary-kapsama'

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
}

function PanoramaPanel() {
  const { map, ready } = useMapContext()
  const [enabled, setEnabled] = useState(true)
  const added = useRef(false)

  useEffect(() => {
    if (!map || !ready || !TOKEN) return
    if (!added.current) {
      addCoverage(map)
      added.current = true
    }
    setLayersVisible(map, [LAYER_ID], enabled)
  }, [map, ready, enabled])

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
        Yeşil çizgiler Mapillary panorama kapsamını gösterir. Kapsama seyrek olabilir.
      </Text>
      <Switch
        size="xs"
        label="Kapsama katmanı"
        checked={enabled}
        onChange={(event) => setEnabled(event.currentTarget.checked)}
      />
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
