// Saha modu: cihazın gerçek GNSS ve IMU donanımını okur, ham veriyi kalibre edip filtreler, izi haritaya çizer.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  SegmentedControl,
  Slider,
  Stack,
  Text,
} from '@mantine/core'
import type { Feature, FeatureCollection } from 'geojson'
import { DISTRICT } from '../config/district'
import { formatDecimal } from '../core/coords'
import { formatDistance } from '../core/format'
import {
  acceptFix,
  complementaryHeading,
  smoothTrack,
  trackLengthM,
  type FixSample,
} from '../sensors/fusion'
import {
  detectCapability,
  isSecureContextReady,
  requestIosPermission,
  startLiveSensors,
  startReplay,
  syntheticTrace,
  type SensorReading,
  type SensorStop,
} from '../sensors/source'
import { useMapContext } from '../map/mapContext'
import { createResultOverlay, type ResultOverlayHandle } from '../map/resultOverlay'
import { ToolMetrics } from './ToolMetrics'
import type { ToolModule } from './types'

type Mode = 'canli' | 'kayit'

function headingCone(lng: number, lat: number, heading: number): Feature {
  const radius = 0.0009
  const spread = 22
  const point = (angle: number): [number, number] => {
    const radians = (angle * Math.PI) / 180
    return [lng + Math.sin(radians) * radius, lat + Math.cos(radians) * radius * 0.75]
  }
  return {
    type: 'Feature',
    properties: { tur: 'yon' },
    geometry: {
      type: 'Polygon',
      coordinates: [[[lng, lat], point(heading - spread), point(heading), point(heading + spread), [lng, lat]]],
    },
  }
}

function FieldPanel() {
  const { map, overlays, ready } = useMapContext()
  const [mode, setMode] = useState<Mode>('canli')
  const [reading, setReading] = useState<SensorReading | null>(null)
  const [heading, setHeading] = useState(0)
  const [alpha, setAlpha] = useState(0.85)
  const [maxAccuracy, setMaxAccuracy] = useState(50)
  const [track, setTrack] = useState<FixSample[]>([])
  const [recording, setRecording] = useState(false)
  const [rejected, setRejected] = useState(0)

  const overlayRef = useRef<ResultOverlayHandle | null>(null)
  const stopRef = useRef<SensorStop | null>(null)
  const headingRef = useRef(0)
  const lastRef = useRef(performance.now())
  const recordingRef = useRef(false)
  const alphaRef = useRef(alpha)
  const accuracyRef = useRef(maxAccuracy)

  recordingRef.current = recording
  alphaRef.current = alpha
  accuracyRef.current = maxAccuracy

  const capability = detectCapability()
  const secure = isSecureContextReady()

  useEffect(() => {
    if (!map || !overlays || !ready) return
    const handle = createResultOverlay(map, overlays, 'saha', '#f97316')
    overlayRef.current = handle
    return () => {
      handle.destroy()
      overlayRef.current = null
    }
  }, [map, overlays, ready])

  const onReading = useCallback((next: SensorReading) => {
    setReading(next)

    const now = performance.now()
    const dt = Math.min(1, Math.max(0.001, (now - lastRef.current) / 1000))
    lastRef.current = now

    if (next.pusulaDerece !== null) {
      headingRef.current = complementaryHeading(
        headingRef.current,
        {
          pusulaDerece: next.pusulaDerece,
          jiroskopDereceSaniye: next.jiroskopDereceSaniye,
          dtSaniye: dt,
        },
        alphaRef.current,
      )
      setHeading(headingRef.current)
    }

    if (next.konum) {
      const fix: FixSample = {
        lng: next.konum.lng,
        lat: next.konum.lat,
        dogrulukM: next.konum.dogrulukM,
        zaman: Date.now(),
      }
      if (!acceptFix(fix, accuracyRef.current)) {
        setRejected((count) => count + 1)
        return
      }
      if (recordingRef.current) setTrack((previous) => [...previous, fix])
    }
  }, [])

  const start = async (): Promise<void> => {
    stopRef.current?.()
    headingRef.current = 0
    lastRef.current = performance.now()

    if (mode === 'kayit') {
      stopRef.current = startReplay(
        syntheticTrace(DISTRICT.center[0], DISTRICT.center[1]),
        250,
        onReading,
      )
      return
    }

    await requestIosPermission()
    stopRef.current = startLiveSensors(onReading)
  }

  const stop = (): void => {
    stopRef.current?.()
    stopRef.current = null
  }

  useEffect(() => () => stopRef.current?.(), [])

  useEffect(() => {
    const handle = overlayRef.current
    if (!handle) return

    const smoothed = smoothTrack(track, 5)
    const features: Feature[] = []

    if (smoothed.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { tur: 'iz' },
        geometry: { type: 'LineString', coordinates: smoothed.map((fix) => [fix.lng, fix.lat]) },
      })
    }

    const current = reading?.konum
    if (current) {
      features.push(headingCone(current.lng, current.lat, heading))
      features.push({
        type: 'Feature',
        properties: { tur: 'konum' },
        geometry: { type: 'Point', coordinates: [current.lng, current.lat] },
      })
    }

    handle.setData({ type: 'FeatureCollection', features } as FeatureCollection)
  }, [track, reading, heading])

  const smoothedLength = trackLengthM(smoothTrack(track, 5))
  const rawLength = trackLengthM(track)

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Cihazın konum alıcısı, ivmeölçer, jiroskop ve manyetometre verisini okur; ham yönü
        tamamlayıcı filtreyle yumuşatır, doğruluğu düşük konum sabitlerini eler.
      </Text>

      {!secure ? (
        <Alert color="yellow" p="xs">
          <Text size="xs">
            Sensör API'leri güvenli bağlam ister. localhost dışında HTTPS gerekir.
          </Text>
        </Alert>
      ) : null}

      <Group gap={6}>
        <Badge size="xs" variant={capability.konum ? 'filled' : 'default'} color="teal">
          Konum {capability.konum ? 'var' : 'yok'}
        </Badge>
        <Badge size="xs" variant={capability.yonelim ? 'filled' : 'default'} color="teal">
          Yönelim {capability.yonelim ? 'var' : 'yok'}
        </Badge>
        <Badge size="xs" variant={capability.hareket ? 'filled' : 'default'} color="teal">
          Hareket {capability.hareket ? 'var' : 'yok'}
        </Badge>
      </Group>

      <SegmentedControl
        size="xs"
        fullWidth
        value={mode}
        onChange={(value) => setMode(value as Mode)}
        data={[
          { value: 'canli', label: 'Canlı sensör' },
          { value: 'kayit', label: 'Kayıt tekrarı' },
        ]}
      />

      {mode === 'canli' ? (
        <Alert color="blue" p="xs">
          <Text fz={10}>
            Masaüstünde GNSS alıcısı ve IMU bulunmaz: konum Wi-Fi ile kestirilir, yönelim/hareket
            olayları çoğu masaüstünde hiç tetiklenmez. Gerçek ölçüm için telefon, gösterim için
            DevTools sensör emülasyonu veya kayıt tekrarı kullanın.
          </Text>
        </Alert>
      ) : null}

      <Group gap="xs" grow>
        <Button size="xs" onClick={() => void start()}>
          Başlat
        </Button>
        <Button size="xs" variant="subtle" onClick={stop}>
          Durdur
        </Button>
      </Group>

      <Stack gap={2}>
        <Text fz={10} c="dimmed">
          Filtre ağırlığı (jiroskop payı): {alpha.toFixed(2)}
        </Text>
        <Slider size="xs" min={0.5} max={0.99} step={0.01} value={alpha} onChange={setAlpha} />
      </Stack>

      <Stack gap={2}>
        <Text fz={10} c="dimmed">
          Konum doğruluk eşiği: {maxAccuracy} m
        </Text>
        <Slider size="xs" min={5} max={500} step={5} value={maxAccuracy} onChange={setMaxAccuracy} />
      </Stack>

      <ToolMetrics
        items={[
          {
            label: 'Konum',
            value: reading?.konum
              ? formatDecimal(reading.konum.lng, reading.konum.lat, 5)
              : '—',
          },
          { label: 'Doğruluk', value: reading?.konum ? `${reading.konum.dogrulukM.toFixed(0)} m` : '—' },
          {
            label: 'Yükseklik',
            value: reading?.konum?.yukseklikM != null ? `${reading.konum.yukseklikM.toFixed(0)} m` : '—',
          },
          { label: 'Ham pusula', value: reading?.pusulaDerece != null ? `${reading.pusulaDerece.toFixed(0)}°` : '—' },
          { label: 'Filtreli yön', value: `${heading.toFixed(0)}°` },
          { label: 'İvme', value: reading?.ivmeMs2 != null ? `${reading.ivmeMs2.toFixed(2)} m/s²` : '—' },
          { label: 'Elenen sabit', value: String(rejected) },
        ]}
      />

      <Divider label="İz kaydı" labelPosition="left" />

      <Group gap="xs" grow>
        <Button
          size="xs"
          variant={recording ? 'filled' : 'light'}
          {...(recording ? { color: 'red' } : {})}
          onClick={() => setRecording((value) => !value)}
        >
          {recording ? 'Kaydı durdur' : 'Kaydet'}
        </Button>
        <Button
          size="xs"
          variant="subtle"
          onClick={() => {
            setTrack([])
            setRejected(0)
          }}
        >
          Temizle
        </Button>
      </Group>

      <ToolMetrics
        items={[
          { label: 'Nokta', value: String(track.length) },
          { label: 'Ham uzunluk', value: formatDistance(rawLength) },
          { label: 'Filtreli uzunluk', value: formatDistance(smoothedLength) },
        ]}
      />
    </Stack>
  )
}

export const fieldTool: ToolModule = {
  id: 'saha',
  title: 'Saha modu',
  description: 'Cihaz sensörlerini okur',
  access: 'public',
  Panel: FieldPanel,
}
