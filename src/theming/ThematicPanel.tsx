// Tematik harita paneli: mahalleyi seçilen göstergeye göre eşit aralık, kantil veya Jenks ile sınıflandırıp renklendirir ve lejant üretir.

import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Group, NumberInput, Select, Stack, Text } from '@mantine/core'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import {
  buildLegend,
  classify,
  rampColors,
  type ClassifyMethod,
  type LegendBucket,
} from './classify'
import { MAHALLE_FIELDS, fieldValues, loadMahalleThematic } from './mahalleData'
import { useMapContext } from '../map/mapContext'
import {
  OVERLAY_ORDER,
  removeLayers,
  removeSources,
  upsertGeoJsonSource,
  upsertLayer,
} from '../map/overlays'

const SOURCE_ID = 'tematik'
const FILL_LAYER = 'tematik-dolgu'
const LINE_LAYER = 'tematik-cizgi'

const METHODS: { value: ClassifyMethod; label: string }[] = [
  { value: 'jenks', label: 'Doğal kırılım (Jenks)' },
  { value: 'kantil', label: 'Kantil' },
  { value: 'esit-aralik', label: 'Eşit aralık' },
]

export function ThematicPanel() {
  const { map, overlays, ready } = useMapContext()
  const [field, setField] = useState('gecici_barinma')
  const [method, setMethod] = useState<ClassifyMethod>('jenks')
  const [classes, setClasses] = useState(5)
  const [legend, setLegend] = useState<LegendBucket[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dataReady, setDataReady] = useState(false)
  const dataRef = useRef<FeatureCollection<Polygon | MultiPolygon> | null>(null)

  useEffect(() => {
    if (!map || !overlays || !ready) return
    let alive = true

    void loadMahalleThematic()
      .then((data) => {
        if (!alive) return
        dataRef.current = data
        setDataReady(true)
        overlays.register({
          id: SOURCE_ID,
          order: OVERLAY_ORDER.analysis,
          apply(target) {
            upsertGeoJsonSource(target, SOURCE_ID, data)
            upsertLayer(target, {
              id: FILL_LAYER,
              type: 'fill',
              source: SOURCE_ID,
              paint: { 'fill-color': '#cccccc', 'fill-opacity': 0.7 },
            })
            upsertLayer(target, {
              id: LINE_LAYER,
              type: 'line',
              source: SOURCE_ID,
              paint: { 'line-color': '#ffffff', 'line-width': 0.8 },
            })
          },
        })
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : 'Mahalle verisi yüklenemedi')
      })

    return () => {
      alive = false
      if (map.getLayer(FILL_LAYER)) removeLayers(map, [FILL_LAYER, LINE_LAYER])
      removeSources(map, [SOURCE_ID])
      overlays.unregister(SOURCE_ID)
    }
  }, [map, overlays, ready])

  useEffect(() => {
    const data = dataRef.current
    if (!map || !data || !dataReady || !map.getLayer(FILL_LAYER)) return

    const values = fieldValues(data, field)
    if (values.length === 0) return

    const result = classify(values, method, classes)
    const colors = rampColors(classes)
    const uniqueBreaks = result.breaks.filter((brk, index) => index === 0 || brk > (result.breaks[index - 1] ?? -Infinity))
    const expression: unknown[] = ['step', ['coalesce', ['to-number', ['get', field]], 0], colors[0]]
    uniqueBreaks.forEach((brk, index) => {
      expression.push(brk, colors[index + 1] ?? colors[colors.length - 1])
    })
    if (uniqueBreaks.length > 0) {
      map.setPaintProperty(FILL_LAYER, 'fill-color', expression as never)
    }
    setLegend(buildLegend(result, classes))
  }, [map, dataReady, field, method, classes])

  if (error) {
    return (
      <Alert color="red" p="xs">
        <Text size="xs">{error}</Text>
      </Alert>
    )
  }

  const fieldOptions = MAHALLE_FIELDS.map((item) => ({ value: item.key, label: item.label }))

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Mahalleleri İBB deprem senaryosu göstergelerine göre renklendirir. Sınıf sınırları seçilen
        yöntemle hesaplanır.
      </Text>

      <Select
        size="xs"
        label="Gösterge"
        data={fieldOptions}
        value={field}
        onChange={(value) => value && setField(value)}
      />
      <Group gap="xs" grow>
        <Select
          size="xs"
          label="Yöntem"
          data={METHODS}
          value={method}
          onChange={(value) => value && setMethod(value as ClassifyMethod)}
          allowDeselect={false}
        />
        <NumberInput
          size="xs"
          label="Sınıf"
          min={3}
          max={6}
          value={classes}
          onChange={(value) => setClasses(typeof value === 'number' ? value : 5)}
        />
      </Group>

      {legend.length > 0 ? (
        <Stack gap={4}>
          <Text size="xs" fw={600}>
            Lejant
          </Text>
          {legend.map((bucket) => (
            <Group key={bucket.label} gap={6} wrap="nowrap">
              <Box w={16} h={12} bg={bucket.color} style={{ borderRadius: 2, flexShrink: 0 }} />
              <Text fz={10} c="dimmed">
                {bucket.label}
              </Text>
            </Group>
          ))}
        </Stack>
      ) : null}
    </Stack>
  )
}
