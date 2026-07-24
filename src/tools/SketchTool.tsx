// Çizim ve düzenleme aracı: serbest geometriler oluşturur, listeler, odaklar, siler ve GeoJSON olarak dışa aktarır.

import { useEffect, useRef, useState } from 'react'
import { ActionIcon, Button, Group, ScrollArea, SegmentedControl, Stack, Text } from '@mantine/core'
import { area, bbox, length } from '@turf/turf'
import type { Feature } from 'geojson'
import { formatArea, formatDistance } from '../core/format'
import { startDrawSession, type DrawFeature, type DrawMode, type DrawSession } from '../map/draw'
import { useMapContext } from '../map/mapContext'
import { SKETCH_COLOR } from '../map/useSketchOverlay'
import { useAppStore } from '../store/appStore'
import type { ToolModule } from './types'

function describe(feature: Feature): string {
  const geometry = feature.geometry
  if (geometry.type === 'Point') return 'Nokta'
  if (geometry.type === 'LineString') {
    return `Hat · ${formatDistance(length(feature, { units: 'meters' }))}`
  }
  if (geometry.type === 'Polygon') return `Alan · ${formatArea(area(feature))}`
  return geometry.type
}

function SketchPanel() {
  const { map, overlays, ready } = useMapContext()
  const [mode, setMode] = useState<DrawMode>('polygon')
  const [pending, setPending] = useState<DrawFeature | null>(null)
  const sessionRef = useRef<DrawSession | null>(null)
  const sketch = useAppStore((state) => state.sketch)
  const addSketch = useAppStore((state) => state.addSketch)
  const removeSketch = useAppStore((state) => state.removeSketch)
  const clearSketch = useAppStore((state) => state.clearSketch)

  useEffect(() => {
    if (!map || !overlays || !ready) return
    setPending(null)
    const session = startDrawSession(map, overlays, {
      mode,
      color: SKETCH_COLOR,
      onChange: (next) => setPending(next),
      onFinish: (next) => setPending(next),
    })
    sessionRef.current = session
    return () => {
      session.destroy()
      sessionRef.current = null
    }
  }, [map, overlays, ready, mode])

  const commit = (): void => {
    if (!pending) return
    addSketch({
      ...pending,
      id: `taslak-${Date.now().toString(36)}`,
      properties: { ...pending.properties, tur: mode },
    })
    sessionRef.current?.reset()
    setPending(null)
  }

  const focus = (feature: Feature): void => {
    if (!map) return
    const [west, south, east, north] = bbox(feature)
    if (west === east && south === north) {
      map.flyTo({ center: [west, south], zoom: Math.max(map.getZoom(), 16) })
      return
    }
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 80, duration: 600 },
    )
  }

  const download = (): void => {
    const blob = new Blob([JSON.stringify({ type: 'FeatureCollection', features: sketch }, null, 2)], {
      type: 'application/geo+json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'arnavutkoy-cizim.geojson'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Stack gap="sm">
      <SegmentedControl
        fullWidth
        size="xs"
        value={mode}
        onChange={(value) => setMode(value as DrawMode)}
        data={[
          { value: 'point', label: 'Nokta' },
          { value: 'line', label: 'Hat' },
          { value: 'polygon', label: 'Alan' },
        ]}
      />

      <Text size="xs" c="dimmed">
        Geometriyi çizip kaydedin. Kaydedilen çizimler araç değiştirseniz de haritada kalır.
      </Text>

      <Group gap="xs" grow>
        <Button size="xs" disabled={!pending} onClick={commit}>
          Kaydet
        </Button>
        <Button size="xs" variant="light" onClick={() => sessionRef.current?.undo()}>
          Geri al
        </Button>
        <Button size="xs" variant="subtle" onClick={() => sessionRef.current?.reset()}>
          Sıfırla
        </Button>
      </Group>

      {sketch.length > 0 ? (
        <ScrollArea.Autosize mah={220}>
          <Stack gap={6}>
            {sketch.map((feature) => (
              <Group key={String(feature.id)} justify="space-between" gap="xs" wrap="nowrap">
                <Text size="xs" style={{ flex: 1 }} truncate>
                  {describe(feature)}
                </Text>
                <ActionIcon size="sm" variant="subtle" onClick={() => focus(feature)}>
                  ⌖
                </ActionIcon>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={() => removeSketch(String(feature.id))}
                >
                  ×
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      ) : (
        <Text size="xs" c="dimmed">
          Kayıtlı çizim yok.
        </Text>
      )}

      <Group gap="xs" grow>
        <Button size="xs" variant="light" disabled={sketch.length === 0} onClick={download}>
          GeoJSON indir
        </Button>
        <Button
          size="xs"
          variant="subtle"
          color="red"
          disabled={sketch.length === 0}
          onClick={clearSketch}
        >
          Tümünü sil
        </Button>
      </Group>
    </Stack>
  )
}

export const sketchTool: ToolModule = {
  id: 'cizim',
  title: 'Çizim',
  description: 'Serbest geometri çizer ve düzenler',
  access: 'public',
  Panel: SketchPanel,
}
