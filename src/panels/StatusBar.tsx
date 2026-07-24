// Durum çubuğu: imleç koordinatı, yakınlaştırma düzeyi, çözünürlük ve veri sürümünü gösterir.

import { useEffect, useState } from 'react'
import { Group, Text } from '@mantine/core'
import { formatDecimal } from '../core/coords'
import { loadManifest, type DataManifest } from '../core/dataset'
import { formatDistance, metersPerPixel } from '../core/format'
import { useMapContext } from '../map/mapContext'

export function StatusBar() {
  const { map, ready } = useMapContext()
  const [cursor, setCursor] = useState<{ lng: number; lat: number } | null>(null)
  const [zoom, setZoom] = useState(0)
  const [manifest, setManifest] = useState<DataManifest | null>(null)

  useEffect(() => {
    void loadManifest().then(setManifest)
  }, [])

  useEffect(() => {
    if (!map || !ready) return
    const onMove = (event: { lngLat: { lng: number; lat: number } }): void =>
      setCursor({ lng: event.lngLat.lng, lat: event.lngLat.lat })
    const onZoom = (): void => setZoom(map.getZoom())
    const onLeave = (): void => setCursor(null)

    onZoom()
    map.on('mousemove', onMove)
    map.on('mouseout', onLeave)
    map.on('zoom', onZoom)

    return () => {
      map.off('mousemove', onMove)
      map.off('mouseout', onLeave)
      map.off('zoom', onZoom)
    }
  }, [map, ready])

  const resolution = cursor ? metersPerPixel(cursor.lat, zoom) : null

  return (
    <Group h="100%" px="sm" gap="lg" wrap="nowrap">
      <Text size="xs" ff="monospace">
        {cursor ? formatDecimal(cursor.lng, cursor.lat) : '—'}
      </Text>
      <Text size="xs" c="dimmed">
        z{zoom.toFixed(2)}
      </Text>
      <Text size="xs" c="dimmed" visibleFrom="sm">
        {resolution ? `${formatDistance(resolution)}/px` : ''}
      </Text>
      <Text size="xs" c="dimmed" ml="auto" visibleFrom="sm" truncate>
        Veri sürümü: {manifest?.version ?? '—'}
      </Text>
    </Group>
  )
}
