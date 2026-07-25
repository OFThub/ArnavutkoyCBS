// Analiz sonucunu jenerik çizer: özet, metrik kartları, tablo ve grafik; yeni analiz yazan kişi UI'a dokunmaz.

import { Suspense, lazy } from 'react'
import { Loader, Paper, ScrollArea, Stack, Table, Text } from '@mantine/core'
import type { AnalysisResult } from '../core/types'
import { ToolMetrics } from '../tools/ToolMetrics'

const ResultChart = lazy(() => import('./ResultChart').then((m) => ({ default: m.ResultChart })))

export function ResultPanel({ result }: { result: AnalysisResult }) {
  return (
    <Stack gap="sm">
      <Paper withBorder radius="sm" p="xs" bg="var(--mantine-color-default-hover)">
        <Text size="xs">{result.summary}</Text>
      </Paper>

      {result.metrics.length > 0 ? (
        <ToolMetrics
          items={result.metrics.map((metric) => ({
            label: metric.label,
            value: metric.unit ? `${metric.value} ${metric.unit}` : String(metric.value),
          }))}
        />
      ) : null}

      {result.chart ? (
        <Suspense fallback={<Loader size="sm" />}>
          <ResultChart spec={result.chart} />
        </Suspense>
      ) : null}

      {result.table ? (
        <ScrollArea.Autosize mah={280}>
          <Table striped withRowBorders={false} fz={10} verticalSpacing={2} horizontalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                {result.table.columns.map((column) => (
                  <Table.Th key={column}>{column}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {result.table.rows.map((row, index) => (
                <Table.Tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <Table.Td key={cellIndex}>{cell}</Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      ) : null}
    </Stack>
  )
}
