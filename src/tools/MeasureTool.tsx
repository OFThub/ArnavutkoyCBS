// Mesafe ve alan ölçümü aracı: çizilen geometrinin uzunluk, çevre ve alan değerlerini canlı raporlar.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Group, SegmentedControl, Stack, Text } from '@mantine/core'
import { area, distance, length, midpoint } from '@turf/turf'
import { formatArea, formatDistance } from '../core/format'
import {
  startDrawSession,
  toPair,
  type DrawFeature,
  type DrawSession,
  type LngLatPair,
} from '../map/draw'
import { MapMarkerPortal } from '../map/MapMarkerPortal'
import { useMapContext } from '../map/mapContext'
import { ToolMetrics } from './ToolMetrics'
import type { ToolModule } from './types'

type MeasureMode = 'line' | 'polygon'

const MAX_LABELS = 60

function ringOf(feature: DrawFeature | null): LngLatPair[] {
  if (!feature) return []
  const raw =
    feature.geometry.type === 'LineString'
      ? feature.geometry.coordinates
      : feature.geometry.type === 'Polygon'
        ? (feature.geometry.coordinates[0] ?? [])
        : []
  return raw.map(toPair).filter((pair): pair is LngLatPair => pair !== null)
}

function MeasurePanel() {
  const { map, overlays, ready } = useMapContext()
  const [mode, setMode] = useState<MeasureMode>('line')
  const [feature, setFeature] = useState<DrawFeature | null>(null)
  const sessionRef = useRef<DrawSession | null>(null)

  useEffect(() => {
    if (!map || !overlays || !ready) return
    setFeature(null)
    const session = startDrawSession(map, overlays, {
      mode,
      onChange: (next) => setFeature(next),
      onFinish: (next) => setFeature(next),
    })
    sessionRef.current = session
    return () => {
      session.destroy()
      sessionRef.current = null
    }
  }, [map, overlays, ready, mode])

  const ring = ringOf(feature)

  const segments = useMemo(() => {
    const list: { key: string; lng: number; lat: number; label: string }[] = []
    for (let index = 0; index + 1 < ring.length && list.length < MAX_LABELS; index += 1) {
      const from = ring[index]
      const to = ring[index + 1]
      if (!from || !to) continue
      const mid = toPair(midpoint(from, to).geometry.coordinates)
      if (!mid) continue
      list.push({
        key: `${index}`,
        lng: mid[0],
        lat: mid[1],
        label: formatDistance(distance(from, to, { units: 'meters' })),
      })
    }
    return list
  }, [ring])

  const totalMeters =
    ring.length >= 2
      ? length(
          { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ring } },
          { units: 'meters' },
        )
      : 0

  const polygonArea = feature?.geometry.type === 'Polygon' ? area(feature) : 0

  return (
    <Stack gap="sm">
      <SegmentedControl
        fullWidth
        size="xs"
        value={mode}
        onChange={(value) => setMode(value as MeasureMode)}
        data={[
          { value: 'line', label: 'Mesafe' },
          { value: 'polygon', label: 'Alan' },
        ]}
      />

      <Text size="xs" c="dimmed">
        Haritaya tıklayarak köşe ekleyin. Çift tıklama, sağ tık veya Enter bitirir; Backspace son
        köşeyi siler, Esc temizler. Köşeleri sürükleyerek düzeltebilirsiniz.
      </Text>

      <ToolMetrics
        items={
          mode === 'polygon'
            ? [
                { label: 'Alan', value: formatArea(polygonArea) },
                { label: 'Çevre', value: formatDistance(totalMeters) },
                { label: 'Köşe', value: String(Math.max(ring.length - 1, 0)) },
              ]
            : [
                { label: 'Uzunluk', value: formatDistance(totalMeters) },
                { label: 'Parça', value: String(Math.max(ring.length - 1, 0)) },
              ]
        }
      />

      <Group gap="xs" grow>
        <Button size="xs" variant="light" onClick={() => sessionRef.current?.finish()}>
          Bitir
        </Button>
        <Button size="xs" variant="light" onClick={() => sessionRef.current?.undo()}>
          Geri al
        </Button>
        <Button size="xs" variant="subtle" color="red" onClick={() => sessionRef.current?.reset()}>
          Temizle
        </Button>
      </Group>

      {segments.map((segment) => (
        <MapMarkerPortal key={segment.key} lng={segment.lng} lat={segment.lat}>
          <Badge size="xs" variant="filled" color="teal">
            {segment.label}
          </Badge>
        </MapMarkerPortal>
      ))}
    </Stack>
  )
}

export const measureTool: ToolModule = {
  id: 'olcum',
  title: 'Ölçüm',
  description: 'Mesafe ve alan ölçer',
  access: 'public',
  Panel: MeasurePanel,
}
