// Tampon analizi aracı: çizilen geometrinin çevresinde verilen yarıçapta alan üretir ve isteğe bağlı ilçeye kırpar.

import { useEffect, useRef, useState } from 'react'
import { Button, Checkbox, Group, NumberInput, SegmentedControl, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { area, buffer, featureCollection, intersect, length, polygonToLine } from '@turf/turf'
import type { FeatureCollection } from 'geojson'
import { loadDataset } from '../core/dataset'
import { formatArea, formatDistance } from '../core/format'
import { firstAreaFeature, type AreaFeature } from '../core/mask'
import { startDrawSession, type DrawFeature, type DrawSession } from '../map/draw'
import { useMapContext } from '../map/mapContext'
import { createResultOverlay, type ResultOverlayHandle } from '../map/resultOverlay'
import { ToolMetrics } from './ToolMetrics'
import type { DrawMode } from '../map/draw'
import type { ToolModule } from './types'

interface BufferMetrics {
  areaM2: number
  perimeterM: number
  clipped: boolean
}

async function districtArea(): Promise<AreaFeature | null> {
  const data = await loadDataset<FeatureCollection>('district')
  return firstAreaFeature(data)
}

function BufferPanel() {
  const { map, overlays, ready } = useMapContext()
  const [mode, setMode] = useState<DrawMode>('point')
  const [radius, setRadius] = useState<number>(250)
  const [clip, setClip] = useState(true)
  const [source, setSource] = useState<DrawFeature | null>(null)
  const [metrics, setMetrics] = useState<BufferMetrics | null>(null)
  const [busy, setBusy] = useState(false)
  const sessionRef = useRef<DrawSession | null>(null)
  const resultRef = useRef<ResultOverlayHandle | null>(null)

  useEffect(() => {
    if (!map || !overlays || !ready) return
    const handle = createResultOverlay(map, overlays, 'tampon', '#6366f1')
    resultRef.current = handle
    return () => {
      handle.destroy()
      resultRef.current = null
    }
  }, [map, overlays, ready])

  useEffect(() => {
    if (!map || !overlays || !ready) return
    setSource(null)
    setMetrics(null)
    resultRef.current?.clear()
    const session = startDrawSession(map, overlays, {
      mode,
      color: '#6366f1',
      onChange: (next) => setSource(next),
      onFinish: (next) => setSource(next),
    })
    sessionRef.current = session
    return () => {
      session.destroy()
      sessionRef.current = null
    }
  }, [map, overlays, ready, mode])

  const compute = async (): Promise<void> => {
    if (!source) return
    setBusy(true)
    try {
      const zone = buffer(source, radius, { units: 'meters' })
      if (!zone) throw new Error('Tampon üretilemedi')

      let result = zone
      let clipped = false
      if (clip) {
        const district = await districtArea()
        if (district) {
          const trimmed = intersect(featureCollection([zone, district]))
          if (!trimmed) throw new Error('Tampon ilçe sınırının tamamen dışında kaldı')
          result = trimmed
          clipped = true
        }
      }

      resultRef.current?.setData(featureCollection([result]) as FeatureCollection)
      setMetrics({
        areaM2: area(result),
        perimeterM: length(polygonToLine(result), { units: 'meters' }),
        clipped,
      })
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Tampon analizi',
        message: error instanceof Error ? error.message : 'Hesaplama başarısız',
      })
    } finally {
      setBusy(false)
    }
  }

  const clear = (): void => {
    sessionRef.current?.reset()
    resultRef.current?.clear()
    setMetrics(null)
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

      <NumberInput
        size="xs"
        label="Yarıçap"
        suffix=" m"
        min={1}
        max={20000}
        step={50}
        value={radius}
        onChange={(value) => setRadius(typeof value === 'number' ? value : Number(value) || 0)}
      />

      <Checkbox
        size="xs"
        label="İlçe sınırına kırp"
        checked={clip}
        onChange={(event) => setClip(event.currentTarget.checked)}
      />

      <Text size="xs" c="dimmed">
        Haritada geometriyi çizin, ardından tamponu hesaplayın.
      </Text>

      {metrics ? (
        <ToolMetrics
          items={[
            { label: 'Tampon alanı', value: formatArea(metrics.areaM2) },
            { label: 'Çevre', value: formatDistance(metrics.perimeterM) },
            { label: 'Kırpma', value: metrics.clipped ? 'İlçe sınırı' : 'Yok' },
          ]}
        />
      ) : null}

      <Group gap="xs" grow>
        <Button size="xs" loading={busy} disabled={!source} onClick={() => void compute()}>
          Hesapla
        </Button>
        <Button size="xs" variant="subtle" color="red" onClick={clear}>
          Temizle
        </Button>
      </Group>
    </Stack>
  )
}

export const bufferTool: ToolModule = {
  id: 'tampon',
  title: 'Tampon',
  description: 'Çevresinde etki alanı üretir',
  access: 'public',
  Panel: BufferPanel,
}
