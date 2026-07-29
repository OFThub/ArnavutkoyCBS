// Donanım başarım testi paneli: cihaz künyesini okur, gerçek iş yüklerini ölçer, çekirdek ölçekleme ve GPU kare süresi çıkarır.

import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Group,
  Loader,
  Progress,
  ScrollArea,
  Stack,
  Table,
  Text,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { readDeviceProfile, workerLadder, type DeviceProfile } from '../bench/device'
import { measureMapFrames, type GpuResult } from '../bench/gpu'
import { measureScaling, type ScalingSet } from '../bench/parallel'
import { amdahlSerialFraction } from '../bench/stats'
import {
  buildWorkloads,
  cleanupWorkloads,
  runWorkload,
  syntheticGrid,
  type WorkloadResult,
} from '../bench/workloads'
import { exportBenchExcel, exportBenchJson, throughputLabel } from '../bench/report'
import { useMapContext } from '../map/mapContext'
import { ToolMetrics } from './ToolMetrics'
import type { ToolModule } from './types'

const BarChart = lazy(() => import('@mantine/charts').then((m) => ({ default: m.BarChart })))

function BenchmarkPanel() {
  const { map, ready } = useMapContext()
  const [device, setDevice] = useState<DeviceProfile | null>(null)
  const [results, setResults] = useState<WorkloadResult[]>([])
  const [scaling, setScaling] = useState<ScalingSet[]>([])
  const [gpu, setGpu] = useState<GpuResult | null>(null)
  const [progress, setProgress] = useState<{ etiket: string; oran: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [withScaling, setWithScaling] = useState(true)
  const [withGpu, setWithGpu] = useState(true)
  const running = useRef(false)

  useEffect(() => {
    setDevice(readDeviceProfile())
  }, [])

  const run = async (): Promise<void> => {
    if (running.current) return
    running.current = true
    setError(null)
    setResults([])
    setScaling([])
    setGpu(null)

    try {
      setProgress({ etiket: 'Izgara hazırlanıyor', oran: 2 })
      const grid = syntheticGrid()
      const workloads = buildWorkloads(grid)

      const collected: WorkloadResult[] = []
      for (const [index, workload] of workloads.entries()) {
        setProgress({
          etiket: workload.baslik,
          oran: 5 + (index / workloads.length) * 60,
        })
        collected.push(await runWorkload(workload))
        setResults([...collected])
      }
      await cleanupWorkloads()

      if (withScaling) {
        const ladder = workerLadder()
        setProgress({ etiket: `Çekirdek ölçekleme (1→${ladder[ladder.length - 1]} işçi)`, oran: 68 })
        const curve = await measureScaling(ladder, 24, (done, total) => {
          setProgress({ etiket: 'Çekirdek ölçekleme', oran: 68 + (done / total) * 20 })
        })
        setScaling(curve)
      }

      if (withGpu && map && ready) {
        setProgress({ etiket: 'GPU kare süresi', oran: 90 })
        setGpu(await measureMapFrames(map))
      }

      setProgress(null)
      notifications.show({ color: 'teal', title: 'Başarım testi', message: 'Ölçüm tamamlandı' })
    } catch (cause: unknown) {
      setProgress(null)
      setError(cause instanceof Error ? cause.message : 'Ölçüm başarısız')
    } finally {
      running.current = false
    }
  }

  const exportFile = async (kind: 'excel' | 'json'): Promise<void> => {
    if (!device) return
    try {
      const report = { cihaz: device, isYukleri: results, olcekleme: scaling, gpu }
      const file =
        kind === 'excel' ? await exportBenchExcel(report) : exportBenchJson(report)
      notifications.show({ color: 'teal', title: 'Dışa aktarma', message: `${file} indirildi` })
    } catch (cause: unknown) {
      notifications.show({
        color: 'red',
        title: 'Dışa aktarma',
        message: cause instanceof Error ? cause.message : 'Başarısız',
      })
    }
  }

  const chartData = (scaling[0]?.noktalar ?? []).map((point, index) => ({
    isci: `${point.isciSayisi}`,
    alu: Number((scaling[0]?.noktalar[index]?.hizlanma ?? 0).toFixed(2)),
    bellek: Number((scaling[1]?.noktalar[index]?.hizlanma ?? 0).toFixed(2)),
  }))

  const scalingMetrics = scaling.flatMap((set) => {
    const peak = set.noktalar[set.noktalar.length - 1]
    if (!peak) return []
    const serial =
      peak.isciSayisi > 1 ? amdahlSerialFraction(peak.isciSayisi, peak.hizlanma) : Number.NaN
    return [
      {
        label: `${set.baslik} · hızlanma`,
        value: `${peak.hizlanma.toFixed(2)}× (verim %${(peak.verimlilik * 100).toFixed(0)})`,
      },
      {
        label: `${set.baslik} · Amdahl seri oranı`,
        value: Number.isFinite(serial) ? `%${(serial * 100).toFixed(1)}` : '—',
      },
    ]
  })

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Uygulamanın kendi hesap yükleri ölçülür: topografya türetme, eşyükselti çıkarma, bellek
        taraması, kalıcı depolama ve harita çizimi. Sonuçlar bu cihazın donanım profilini verir.
      </Text>

      {device ? (
        <ToolMetrics
          items={[
            { label: 'CPU çekirdeği', value: String(device.cekirdek ?? '—') },
            { label: 'Bellek', value: device.bellekGb ? `${device.bellekGb} GB` : '—' },
            { label: 'GPU', value: device.gpuModel ?? '—' },
            { label: 'Ekran', value: `${device.ekran} @${device.pikselOrani}×` },
            { label: 'JS yığını', value: device.jsYiginiSinirMb ? `${device.jsYiginiSinirMb} MB` : '—' },
          ]}
        />
      ) : null}

      <Group gap="md">
        <Checkbox
          size="xs"
          label="Çekirdek ölçekleme"
          checked={withScaling}
          onChange={(event) => setWithScaling(event.currentTarget.checked)}
        />
        <Checkbox
          size="xs"
          label="GPU kare süresi"
          checked={withGpu}
          onChange={(event) => setWithGpu(event.currentTarget.checked)}
        />
      </Group>

      <Button size="xs" onClick={() => void run()} loading={progress !== null}>
        Ölçümü başlat
      </Button>

      {progress ? (
        <Stack gap={4}>
          <Progress value={progress.oran} size="sm" animated />
          <Text fz={10} c="dimmed">
            {progress.etiket}
          </Text>
        </Stack>
      ) : null}

      {error ? (
        <Alert color="red" p="xs">
          <Text size="xs">{error}</Text>
        </Alert>
      ) : null}

      {results.length > 0 ? (
        <>
          <Divider label="İş yükleri" labelPosition="left" />
          <ScrollArea.Autosize mah={260}>
            <Table striped withRowBorders={false} fz={10} verticalSpacing={2} horizontalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>İş yükü</Table.Th>
                  <Table.Th>Medyan</Table.Th>
                  <Table.Th>En iyi</Table.Th>
                  <Table.Th>Verim</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {results.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.baslik}</Table.Td>
                    <Table.Td>{row.zaman.medyanMs.toFixed(1)} ms</Table.Td>
                    <Table.Td>{row.zaman.enIyiMs.toFixed(1)} ms</Table.Td>
                    <Table.Td>{throughputLabel(row)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        </>
      ) : null}

      {scaling.length > 0 ? (
        <>
          <Divider label="Çekirdek ölçekleme" labelPosition="left" />
          <Suspense fallback={<Loader size="sm" />}>
            <BarChart
              h={170}
              data={chartData}
              dataKey="isci"
              series={[
                { name: 'alu', label: 'Hesap (ALU)', color: 'teal.6' },
                { name: 'bellek', label: 'Belleğe bağlı', color: 'orange.6' },
              ]}
              tickLine="none"
              withLegend
            />
          </Suspense>
          <ToolMetrics items={scalingMetrics} />
          <Text fz={10} c="dimmed">
            İki çekirdeğin farkı bu cihazın darboğazını gösterir: yalnız ALU kullanan yük çekirdek
            sayısıyla ölçeklenirken, belleğe bağlı eğim çekirdeği paylaşılan bellek yolunda doyuma
            ulaşır.
          </Text>
        </>
      ) : null}

      {gpu ? (
        <>
          <Divider label="GPU" labelPosition="left" />
          {gpu.not ? (
            <Alert color="yellow" p="xs">
              <Text size="xs">{gpu.not}</Text>
            </Alert>
          ) : null}
          {gpu.kareSayisi > 0 ? (
            <ToolMetrics
              items={[
                { label: 'Ortalama FPS', value: gpu.ortalamaFps.toFixed(1) },
                { label: 'Medyan kare', value: `${gpu.medyanKareMs.toFixed(2)} ms` },
                { label: 'p95 kare', value: `${gpu.p95KareMs.toFixed(2)} ms` },
                { label: 'Örneklenen kare', value: String(gpu.kareSayisi) },
                { label: 'Güvenilir', value: gpu.guvenilir ? 'evet' : 'hayır' },
              ]}
            />
          ) : null}
        </>
      ) : null}

      {results.length > 0 ? (
        <Group gap="xs" grow>
          <Button size="xs" variant="light" onClick={() => void exportFile('excel')}>
            Excel indir
          </Button>
          <Button size="xs" variant="subtle" onClick={() => void exportFile('json')}>
            JSON indir
          </Button>
        </Group>
      ) : null}
    </Stack>
  )
}

export const benchmarkTool: ToolModule = {
  id: 'basarim',
  title: 'Başarım testi',
  description: 'Cihaz donanımını ölçer',
  access: 'public',
  Panel: BenchmarkPanel,
}
