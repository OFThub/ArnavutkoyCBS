// BI panosu: mahalle deprem senaryosu toplamlarını gösterge kartları ve grafiklerle özetler, Excel/PDF rapor indirir.

import { Suspense, lazy, useEffect, useState } from 'react'
import { Alert, Button, Group, Loader, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { formatCount } from '../core/format'
import { loadMahalleThematic } from '../theming/mahalleData'
import { buildReportRows, reportTotals, type MahalleReportRow } from '../reports/mahalleReport'
import { ToolMetrics } from '../tools/ToolMetrics'

const BarChart = lazy(() => import('@mantine/charts').then((m) => ({ default: m.BarChart })))

export function DashboardPanel() {
  const [rows, setRows] = useState<MahalleReportRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    void loadMahalleThematic()
      .then((data) => setRows(buildReportRows(data)))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Pano verisi yüklenemedi'),
      )
  }, [])

  if (error) {
    return (
      <Alert color="red" p="xs">
        <Text size="xs">{error}</Text>
      </Alert>
    )
  }

  if (!rows) return <Loader size="sm" />

  const totals = reportTotals(rows)
  const topBarinma = [...rows]
    .sort((a, b) => (b.values['gecici_barinma'] ?? 0) - (a.values['gecici_barinma'] ?? 0))
    .slice(0, 8)
    .map((row) => ({ mahalle: row.ad, barinma: row.values['gecici_barinma'] ?? 0 }))

  const exportFile = async (kind: 'excel' | 'pdf'): Promise<void> => {
    setBusy(kind)
    try {
      const { exportMahalleExcel, exportMahallePdf } = await import('../reports/mahalleReport')
      const file = kind === 'excel' ? await exportMahalleExcel(rows) : await exportMahallePdf(rows)
      notifications.show({ color: 'teal', title: 'Rapor', message: `${file} indirildi` })
    } catch (cause: unknown) {
      notifications.show({
        color: 'red',
        title: 'Rapor',
        message: cause instanceof Error ? cause.message : 'Dışa aktarma başarısız',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        İBB deprem senaryosu · {rows.length} mahalle
      </Text>

      <ToolMetrics
        items={[
          { label: 'Çok ağır + ağır hasar', value: formatCount((totals['cok_agir_hasarli_bina_sayisi'] ?? 0) + (totals['agir_hasarli_bina_sayisi'] ?? 0)) },
          { label: 'Can kaybı', value: formatCount(totals['can_kaybi_sayisi'] ?? 0) },
          { label: 'Ağır yaralı', value: formatCount(totals['agir_yarali_sayisi'] ?? 0) },
          { label: 'Geçici barınma', value: `${formatCount(totals['gecici_barinma'] ?? 0)} kişi` },
          { label: 'Doğalgaz boru hasarı', value: formatCount(totals['dogalgaz_boru_hasari'] ?? 0) },
          { label: 'İçme suyu boru hasarı', value: formatCount(totals['icme_suyu_boru_hasari'] ?? 0) },
        ]}
      />

      <Text size="xs" fw={600}>
        En yüksek geçici barınma ihtiyacı
      </Text>
      <Suspense fallback={<Loader size="sm" />}>
        <BarChart
          h={180}
          data={topBarinma}
          dataKey="mahalle"
          series={[{ name: 'barinma', label: 'Barınma (kişi)', color: 'indigo.6' }]}
          tickLine="none"
        />
      </Suspense>

      <Group gap="xs" grow>
        <Button size="xs" loading={busy === 'excel'} onClick={() => void exportFile('excel')}>
          Excel indir
        </Button>
        <Button size="xs" variant="light" loading={busy === 'pdf'} onClick={() => void exportFile('pdf')}>
          PDF indir
        </Button>
      </Group>
    </Stack>
  )
}
