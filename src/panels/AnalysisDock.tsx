// Analiz paneli: kayıtlı analizleri kategoriye göre listeler, parametreleri toplar, çalıştırır ve sonucu ResultPanel'e verir.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Accordion,
  Alert,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
} from '@mantine/core'
import { defaultParams, listAnalysesByCategory } from '../core/analysisRegistry'
import type { AnalysisCategory, AnalysisModule, AnalysisResult, ParamSpec } from '../core/types'
import { runAnalysis } from '../analysis/runner'
import { createAnalysisOverlay, type AnalysisOverlayHandle } from '../map/analysisOverlay'
import { useMapContext } from '../map/mapContext'
import { useAppStore } from '../store/appStore'
import { ResultPanel } from './ResultPanel'

const CATEGORY_TITLES: Record<AnalysisCategory, string> = {
  mekansal: 'Mekânsal',
  risk: 'Risk',
  ulasim: 'Ulaşım',
  imar: 'İmar',
  afet: 'Afet',
  idari: 'İdari',
}

function ParamField({
  spec,
  value,
  onChange,
}: {
  spec: ParamSpec
  value: unknown
  onChange: (value: unknown) => void
}) {
  if (spec.kind === 'number') {
    return (
      <NumberInput
        size="xs"
        label={spec.label}
        {...(spec.unit !== undefined ? { suffix: ` ${spec.unit}` } : {})}
        {...(spec.min !== undefined ? { min: spec.min } : {})}
        {...(spec.max !== undefined ? { max: spec.max } : {})}
        {...(spec.step !== undefined ? { step: spec.step } : {})}
        value={typeof value === 'number' ? value : spec.default}
        onChange={(next) => onChange(typeof next === 'number' ? next : Number(next) || 0)}
      />
    )
  }
  if (spec.kind === 'select') {
    return (
      <Select
        size="xs"
        label={spec.label}
        allowDeselect={false}
        data={spec.options}
        value={typeof value === 'string' ? value : spec.default}
        onChange={(next) => next && onChange(next)}
      />
    )
  }
  if (spec.kind === 'boolean') {
    return (
      <Checkbox
        size="xs"
        label={spec.label}
        checked={typeof value === 'boolean' ? value : spec.default}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    )
  }
  return null
}

function AnalysisCard({
  analysis,
  overlay,
}: {
  analysis: AnalysisModule<never>
  overlay: AnalysisOverlayHandle | null
}) {
  const { map } = useMapContext()
  const role = useAppStore((state) => state.role)
  const [params, setParams] = useState<Record<string, unknown>>(() => defaultParams(analysis))
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fields = analysis.params.filter((spec) => spec.kind !== 'geometry')

  const execute = async (): Promise<void> => {
    if (!map) return
    setBusy(true)
    setError(null)
    try {
      const output = await runAnalysis(analysis, map, role, params)
      setResult(output)
      if (output.geojson) overlay?.show(output.geojson, output.style)
      else overlay?.clear()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Analiz başarısız')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap="xs" py={4}>
      {fields.map((spec) => (
        <ParamField
          key={spec.name}
          spec={spec}
          value={params[spec.name]}
          onChange={(value) => setParams((prev) => ({ ...prev, [spec.name]: value }))}
        />
      ))}

      <Group gap="xs" grow>
        <Button size="xs" loading={busy} onClick={() => void execute()}>
          Çalıştır
        </Button>
        <Button
          size="xs"
          variant="subtle"
          onClick={() => {
            setResult(null)
            overlay?.clear()
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

      {result ? <ResultPanel result={result} /> : null}
    </Stack>
  )
}

export function AnalysisDock() {
  const { map, overlays, ready } = useMapContext()
  const role = useAppStore((state) => state.role)
  const overlayRef = useRef<AnalysisOverlayHandle | null>(null)
  const [overlay, setOverlay] = useState<AnalysisOverlayHandle | null>(null)

  useEffect(() => {
    if (!map || !overlays || !ready) return
    const handle = createAnalysisOverlay(map, overlays)
    overlayRef.current = handle
    setOverlay(handle)
    return () => {
      handle.destroy()
      overlayRef.current = null
      setOverlay(null)
    }
  }, [map, overlays, ready])

  const grouped = useMemo(() => listAnalysesByCategory(role), [role])

  if (grouped.size === 0) {
    return (
      <Text size="xs" c="dimmed">
        Kayıtlı analiz yok.
      </Text>
    )
  }

  return (
    <Accordion variant="separated" chevronPosition="left">
      {[...grouped.entries()].map(([category, analyses]) => (
        <Accordion.Item key={category} value={category}>
          <Accordion.Control>
            <Text size="xs" fw={700}>
              {CATEGORY_TITLES[category]}
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Accordion variant="contained" chevronPosition="left">
              {analyses.map((analysis) => (
                <Accordion.Item key={analysis.id} value={analysis.id}>
                  <Accordion.Control>
                    <Text size="xs">{analysis.title}</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <AnalysisCard analysis={analysis} overlay={overlay} />
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
