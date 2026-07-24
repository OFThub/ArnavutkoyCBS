// Yükselti profili aracı: çizilen hat boyunca kesit grafiği, toplam tırmanış ve iniş değerlerini üretir.

import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Alert, Button, Group, Loader, Stack, Text } from '@mantine/core'

const AreaChart = lazy(() =>
  import('@mantine/charts').then((module) => ({ default: module.AreaChart })),
)
import { formatDistance } from '../core/format'
import { elevationProfile, type ProfileResult } from '../core/profile'
import { loadTerrainDerived, type TerrainDerived } from '../data/terrainDerived'
import { startDrawSession, type DrawFeature, type DrawSession } from '../map/draw'
import { useMapContext } from '../map/mapContext'
import { ToolMetrics } from './ToolMetrics'
import type { ToolModule } from './types'

const CHART_POINTS = 120

function ProfilePanel() {
  const { map, overlays, ready } = useMapContext()
  const [derived, setDerived] = useState<TerrainDerived | null>(null)
  const [result, setResult] = useState<ProfileResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<DrawSession | null>(null)
  const derivedRef = useRef<TerrainDerived | null>(null)

  useEffect(() => {
    let alive = true
    loadTerrainDerived()
      .then((value) => {
        if (!alive) return
        derivedRef.current = value
        setDerived(value)
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : 'Yükselti ızgarası yüklenemedi')
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!map || !overlays || !ready) return
    const session = startDrawSession(map, overlays, {
      mode: 'line',
      color: '#7c3aed',
      onFinish: (feature: DrawFeature | null) => {
        const current = derivedRef.current
        if (!feature || feature.geometry.type !== 'LineString' || !current) {
          setResult(null)
          return
        }
        setResult(
          elevationProfile(
            current.grid,
            { type: 'Feature', properties: {}, geometry: feature.geometry },
            CHART_POINTS,
          ),
        )
      },
    })
    sessionRef.current = session
    return () => {
      session.destroy()
      sessionRef.current = null
    }
  }, [map, overlays, ready])

  if (error) {
    return (
      <Alert color="red" p="xs">
        <Text size="xs">{error}</Text>
      </Alert>
    )
  }

  const chartData = (result?.samples ?? []).map((item) => ({
    mesafe: Number((item.mesafe / 1000).toFixed(2)),
    yukselti: Number(item.yukselti.toFixed(1)),
  }))

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        {derived
          ? 'Haritada bir hat çizin; çift tıklama veya Enter ile bitirin. Kesit anında hesaplanır.'
          : 'Yükselti ızgarası hazırlanıyor…'}
      </Text>

      {result && chartData.length > 1 ? (
        <>
          <Suspense fallback={<Loader size="sm" />}>
            <AreaChart
              h={160}
              data={chartData}
              dataKey="mesafe"
              series={[{ name: 'yukselti', label: 'Yükselti (m)', color: 'violet.6' }]}
              curveType="monotone"
              withDots={false}
              gridAxis="xy"
              unit=" m"
              xAxisLabel="km"
            />
          </Suspense>
          <ToolMetrics
            items={[
              { label: 'Hat uzunluğu', value: formatDistance(result.totalMeters) },
              {
                label: 'Yükselti aralığı',
                value: `${result.minElevation.toFixed(0)} – ${result.maxElevation.toFixed(0)} m`,
              },
              { label: 'Toplam tırmanış', value: `${result.ascent.toFixed(0)} m` },
              { label: 'Toplam iniş', value: `${result.descent.toFixed(0)} m` },
            ]}
          />
        </>
      ) : null}

      <Group gap="xs" grow>
        <Button size="xs" variant="light" onClick={() => sessionRef.current?.finish()}>
          Bitir
        </Button>
        <Button
          size="xs"
          variant="subtle"
          color="red"
          onClick={() => {
            sessionRef.current?.reset()
            setResult(null)
          }}
        >
          Temizle
        </Button>
      </Group>
    </Stack>
  )
}

export const profileTool: ToolModule = {
  id: 'profil',
  title: 'Yükselti profili',
  description: 'Hat boyunca kesit grafiği',
  access: 'public',
  Panel: ProfilePanel,
}
