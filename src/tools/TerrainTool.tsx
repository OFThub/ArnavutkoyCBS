// Arazi aracı: DEM ızgarasını kurar, 3B araziyi ve kontur aralığını yönetir, tıklanan noktanın topografyasını raporlar.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Divider,
  Group,
  NumberInput,
  Progress,
  Slider,
  Stack,
  Switch,
  Text,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import type { MapMouseEvent } from 'maplibre-gl'
import { DISTRICT } from '../config/district'
import { formatDecimal } from '../core/coords'
import { formatDistance } from '../core/format'
import { ASPECT_SECTORS, TERRAIN_CLASSES, aspectSector, cellSizeMeters } from '../core/terrain'
import { demTileCount } from '../data/dem'
import { referenceElevation } from '../data/elevationApi'
import {
  loadTerrainDerived,
  terrainSampleAt,
  type TerrainDerived,
  type TerrainSample,
} from '../data/terrainDerived'
import { useMapContext } from '../map/mapContext'
import { useAppStore } from '../store/appStore'
import { ToolMetrics } from './ToolMetrics'
import type { ToolModule } from './types'

interface CrossCheck {
  grid: number
  reference: number
  source: string
  deviation: number
}

function TerrainPanel() {
  const { map, overlays, ready } = useMapContext()
  const [derived, setDerived] = useState<TerrainDerived | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sample, setSample] = useState<{ lng: number; lat: number; data: TerrainSample } | null>(null)
  const [check, setCheck] = useState<CrossCheck | null>(null)

  const terrain3d = useAppStore((state) => state.terrain3d)
  const setTerrain3d = useAppStore((state) => state.setTerrain3d)
  const exaggeration = useAppStore((state) => state.terrainExaggeration)
  const setExaggeration = useAppStore((state) => state.setTerrainExaggeration)
  const contourInterval = useAppStore((state) => state.contourInterval)
  const setContourInterval = useAppStore((state) => state.setContourInterval)
  const derivedRef = useRef<TerrainDerived | null>(null)

  useEffect(() => {
    let alive = true
    setProgress({ done: 0, total: demTileCount() })
    loadTerrainDerived((done, total) => {
      if (alive) setProgress({ done, total })
    })
      .then((value) => {
        if (!alive) return
        derivedRef.current = value
        setDerived(value)
        setProgress(null)
      })
      .catch((cause: unknown) => {
        if (!alive) return
        setProgress(null)
        setError(cause instanceof Error ? cause.message : 'Yükselti ızgarası üretilemedi')
      })
    return () => {
      alive = false
    }
  }, [])

  const onMapClick = useCallback((event: MapMouseEvent) => {
    const current = derivedRef.current
    if (!current) return
    const data = terrainSampleAt(current, event.lngLat.lng, event.lngLat.lat)
    setSample(data ? { lng: event.lngLat.lng, lat: event.lngLat.lat, data } : null)
  }, [])

  useEffect(() => {
    if (!map || !ready) return
    map.on('click', onMapClick)
    map.getCanvas().style.cursor = 'help'
    return () => {
      map.off('click', onMapClick)
      map.getCanvas().style.cursor = ''
    }
  }, [map, ready, onMapClick])

  const runCrossCheck = async (): Promise<void> => {
    if (!derived) return
    try {
      const [lng, lat] = DISTRICT.center
      const grid = terrainSampleAt(derived, lng, lat)?.elevation ?? Number.NaN
      const { value, source } = await referenceElevation(lng, lat)
      setCheck({ grid, reference: value, source, deviation: Math.abs(grid - value) })
    } catch (cause: unknown) {
      notifications.show({
        color: 'red',
        title: 'Çapraz doğrulama',
        message: cause instanceof Error ? cause.message : 'Referans yükselti alınamadı',
      })
    }
  }

  const applyContourInterval = (): void => {
    useAppStore.getState().toggleLayer('kontur', true)
    overlays?.refresh()
  }

  if (error) {
    return (
      <Alert color="red" p="xs">
        <Text size="xs">{error}</Text>
      </Alert>
    )
  }

  if (!derived) {
    return (
      <Stack gap="xs">
        <Text size="xs" c="dimmed">
          Yükselti döşemeleri indiriliyor ve çözülüyor. Sonuç tarayıcıda saklanır, bir daha
          beklemezsiniz.
        </Text>
        <Progress
          value={progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0}
          size="sm"
          animated
        />
        <Text size="xs" c="dimmed">
          {progress ? `${progress.done} / ${progress.total} döşeme` : 'Hazırlanıyor'}
        </Text>
      </Stack>
    )
  }

  const resolution = cellSizeMeters(derived.grid, derived.grid.height / 2)
  const tolerance = DISTRICT.elevationToleranceM

  return (
    <Stack gap="sm">
      <ToolMetrics
        items={[
          {
            label: 'Izgara',
            value: `${derived.grid.width} × ${derived.grid.height}`,
          },
          { label: 'Çözünürlük', value: `${resolution.toFixed(1)} m/hücre` },
          {
            label: 'Yükselti aralığı',
            value: `${derived.elevation.min.toFixed(0)} – ${derived.elevation.max.toFixed(0)} m`,
          },
          { label: 'Ortalama', value: `${derived.elevation.mean.toFixed(0)} m` },
        ]}
      />

      <Divider label="3B arazi" labelPosition="left" />

      <Switch
        size="xs"
        label="Araziyi 3B göster"
        checked={terrain3d}
        onChange={(event) => setTerrain3d(event.currentTarget.checked)}
      />

      <Stack gap={2}>
        <Text size="xs" c="dimmed">
          Yükseklik abartısı: {exaggeration.toFixed(1)}×
        </Text>
        <Slider
          size="xs"
          min={0.5}
          max={5}
          step={0.1}
          disabled={!terrain3d}
          value={exaggeration}
          onChange={setExaggeration}
          label={(value) => `${value.toFixed(1)}×`}
        />
      </Stack>

      <Divider label="Eşyükselti" labelPosition="left" />

      <Group gap="xs" align="flex-end" wrap="nowrap">
        <NumberInput
          size="xs"
          label="Aralık"
          suffix=" m"
          min={5}
          max={200}
          step={5}
          value={contourInterval}
          onChange={(value) =>
            setContourInterval(typeof value === 'number' ? value : Number(value) || 10)
          }
          style={{ flex: 1 }}
        />
        <Button size="xs" onClick={applyContourInterval}>
          Çiz
        </Button>
      </Group>

      <Divider label="Nokta sorgusu" labelPosition="left" />

      {sample ? (
        <ToolMetrics
          items={[
            { label: 'Konum', value: formatDecimal(sample.lng, sample.lat, 4) },
            { label: 'Yükselti', value: `${sample.data.elevation.toFixed(1)} m` },
            {
              label: 'Eğim',
              value: `%${sample.data.slopePercent.toFixed(1)} · ${sample.data.slopeDegrees.toFixed(1)}°`,
            },
            {
              label: 'Bakı',
              value:
                sample.data.aspectDegrees < 0
                  ? 'Düz'
                  : `${ASPECT_SECTORS[aspectSector(sample.data.aspectDegrees)]?.label ?? '—'} (${sample.data.aspectDegrees.toFixed(0)}°)`,
            },
            { label: 'TPI', value: sample.data.tpi.toFixed(2) },
            { label: 'Topografik konum', value: TERRAIN_CLASSES[sample.data.terrainClass].label },
          ]}
        />
      ) : (
        <Text size="xs" c="dimmed">
          Haritaya tıklayın: yükselti, eğim, bakı ve topografik sınıf okunur.
        </Text>
      )}

      <Divider label="Çapraz doğrulama" labelPosition="left" />

      {check ? (
        <Alert color={check.deviation <= tolerance ? 'teal' : 'yellow'} p="xs">
          <Text size="xs">
            Izgara {check.grid.toFixed(1)} m · {check.source} {check.reference.toFixed(1)} m · sapma{' '}
            {formatDistance(check.deviation)}
            {check.deviation <= tolerance
              ? ` (eşik ${tolerance} m içinde)`
              : ` — ${tolerance} m eşiğinin üzerinde`}
          </Text>
        </Alert>
      ) : null}

      <Button size="xs" variant="light" onClick={() => void runCrossCheck()}>
        Merkezi bağımsız servisle karşılaştır
      </Button>
    </Stack>
  )
}

export const terrainTool: ToolModule = {
  id: 'arazi',
  title: 'Arazi',
  description: '3B arazi, kontur ve nokta topografyası',
  access: 'public',
  Panel: TerrainPanel,
}
