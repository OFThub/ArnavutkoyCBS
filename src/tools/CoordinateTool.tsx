// Koordinata git aracı: ondalık derece veya DMS girdisini çözer, haritayı oraya taşır ve merkez koordinatını gösterir.

import { useEffect, useRef, useState } from 'react'
import { Alert, Button, CopyButton, Group, Stack, Text, TextInput } from '@mantine/core'
import { featureCollection, point } from '@turf/turf'
import type { FeatureCollection } from 'geojson'
import { formatDecimal, formatDms, parseCoordinate } from '../core/coords'
import { DISTRICT } from '../config/district'
import { useMapContext } from '../map/mapContext'
import { createResultOverlay, type ResultOverlayHandle } from '../map/resultOverlay'
import type { ToolModule } from './types'

function insideDistrict(lng: number, lat: number): boolean {
  const [west, south, east, north] = DISTRICT.bbox
  return lng >= west && lng <= east && lat >= south && lat <= north
}

function CoordinatePanel() {
  const { map, overlays, ready } = useMapContext()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [center, setCenter] = useState<{ lng: number; lat: number }>({
    lng: DISTRICT.center[0],
    lat: DISTRICT.center[1],
  })
  const targetRef = useRef<ResultOverlayHandle | null>(null)

  useEffect(() => {
    if (!map || !overlays || !ready) return
    const handle = createResultOverlay(map, overlays, 'hedef-nokta', '#ef4444')
    targetRef.current = handle

    const update = (): void => {
      const next = map.getCenter()
      setCenter({ lng: next.lng, lat: next.lat })
    }
    update()
    map.on('move', update)

    return () => {
      map.off('move', update)
      handle.destroy()
      targetRef.current = null
    }
  }, [map, overlays, ready])

  const go = (): void => {
    const parsed = parseCoordinate(value)
    if (!parsed) {
      setError('Koordinat çözülemedi. Örnek: 41.2484, 28.6554 veya 41°14\'54.2"K 28°39\'19.4"D')
      setWarning(null)
      return
    }
    setError(null)
    setWarning(
      insideDistrict(parsed.lng, parsed.lat) ? null : 'Bu koordinat Arnavutköy sınırlarının dışında.',
    )
    targetRef.current?.setData(
      featureCollection([point([parsed.lng, parsed.lat])]) as FeatureCollection,
    )
    map?.flyTo({ center: [parsed.lng, parsed.lat], zoom: Math.max(map.getZoom(), 15) })
  }

  const decimal = formatDecimal(center.lng, center.lat)
  const dms = formatDms(center.lng, center.lat)

  return (
    <Stack gap="sm">
      <TextInput
        size="xs"
        label="Koordinat"
        placeholder="41.2484, 28.6554"
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') go()
        }}
      />

      <Group gap="xs" grow>
        <Button size="xs" onClick={go}>
          Git
        </Button>
        <Button
          size="xs"
          variant="subtle"
          onClick={() => {
            targetRef.current?.clear()
            setValue('')
            setError(null)
            setWarning(null)
          }}
        >
          Temizle
        </Button>
      </Group>

      {error ? (
        <Alert color="red" p="xs">
          <Text size="xs">{error}</Text>
        </Alert>
      ) : null}

      {warning ? (
        <Alert color="yellow" p="xs">
          <Text size="xs">{warning}</Text>
        </Alert>
      ) : null}

      <Stack gap={4}>
        <Text size="xs" c="dimmed">
          Harita merkezi
        </Text>
        {[
          { label: 'Ondalık', text: decimal },
          { label: 'DMS', text: dms },
        ].map((item) => (
          <Group key={item.label} justify="space-between" gap="xs" wrap="nowrap">
            <Text size="xs" ff="monospace" truncate>
              {item.text}
            </Text>
            <CopyButton value={item.text}>
              {({ copied, copy }) => (
                <Button size="compact-xs" variant="subtle" onClick={copy}>
                  {copied ? 'Kopyalandı' : 'Kopyala'}
                </Button>
              )}
            </CopyButton>
          </Group>
        ))}
      </Stack>
    </Stack>
  )
}

export const coordinateTool: ToolModule = {
  id: 'koordinat',
  title: 'Koordinat',
  description: 'Koordinata gider, merkezi gösterir',
  access: 'public',
  Panel: CoordinatePanel,
}
