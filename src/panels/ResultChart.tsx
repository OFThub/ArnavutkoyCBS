// Analiz sonucundaki grafik belirtimini Mantine grafik bileşenlerine çeviren tembel yüklenen görselleştirici.

import { BarChart, LineChart, PieChart } from '@mantine/charts'
import type { ChartSpec } from '../core/types'

const PALETTE = ['indigo.6', 'teal.6', 'orange.6', 'red.6', 'grape.6', 'blue.6']

export function ResultChart({ spec }: { spec: ChartSpec }) {
  if (spec.type === 'pie') {
    const series = spec.series[0]
    if (!series) return null
    return (
      <PieChart
        h={180}
        withTooltip
        data={spec.data.map((row, index) => ({
          name: String(row[spec.xKey]),
          value: Number(row[series.key]) || 0,
          color: PALETTE[index % PALETTE.length] ?? 'gray.5',
        }))}
      />
    )
  }

  const series = spec.series.map((item, index) => ({
    name: item.key,
    label: item.label,
    color: item.color ?? PALETTE[index % PALETTE.length] ?? 'gray.5',
  }))

  if (spec.type === 'line') {
    return <LineChart h={180} data={spec.data} dataKey={spec.xKey} series={series} curveType="monotone" withDots={false} />
  }
  return <BarChart h={180} data={spec.data} dataKey={spec.xKey} series={series} />
}
