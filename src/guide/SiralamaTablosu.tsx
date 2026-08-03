// 38 mahallenin tek tabloda sıralanması: sütun başlığına tıklayınca o göstergeye göre sıralanır.
// "En yoğun mahalle hangisi", "hastaneye en uzak neresi" sorularının cevabı burada.

import { useMemo, useState } from 'react'
import { Badge, Box, Group, ScrollArea, Stack, Table, Text, UnstyledButton } from '@mantine/core'
import { cubukOrani, metrikBul, sirala, type Metrik } from './karsilastirma'
import type { MahalleKarne } from './guideScore'

const SUTUNLAR = [
  'nufus',
  'alanKm2',
  'yogunluk',
  'genelPuan',
  'agirHasarliBina',
  'hastaneM',
]
  .map((key) => metrikBul(key))
  .filter((metrik): metrik is Metrik => metrik !== undefined)

function Cubuk({ oran, renk }: { oran: number; renk: string }) {
  return (
    <Box
      aria-hidden
      style={{
        height: 3,
        width: `${Math.max(2, oran * 100)}%`,
        background: renk,
        marginTop: 2,
        borderRadius: 1,
      }}
    />
  )
}

export function SiralamaTablosu({
  karneler,
  secililer,
  onSec,
}: {
  karneler: MahalleKarne[]
  /** Karşılaştırmaya alınmış mahalleler; satır vurgulanır. */
  secililer: string[]
  onSec: (uavt: string) => void
}) {
  const [siraKey, setSiraKey] = useState('yogunluk')
  const [artan, setArtan] = useState(false)

  const metrik = metrikBul(siraKey) ?? SUTUNLAR[0]!
  const sirali = useMemo(() => sirala(karneler, metrik, artan), [karneler, metrik, artan])

  const basligaTikla = (sutun: Metrik): void => {
    if (sutun.key === siraKey) {
      setArtan((onceki) => !onceki)
      return
    }
    setSiraKey(sutun.key)
    setArtan(sutun.yon === 'dusuk-iyi')
  }

  return (
    <Stack gap={6}>
      <Text fz={11} c="dimmed">
        Sütun başlığına tıklayarak sıralayın. Satıra tıklayınca mahalle karşılaştırmaya eklenir
        (en fazla 3).
      </Text>

      <ScrollArea.Autosize mah={480} type="auto">
        <Table
          highlightOnHover
          stickyHeader
          fz={11}
          verticalSpacing={4}
          horizontalSpacing="xs"
          striped
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ minWidth: 40 }}>#</Table.Th>
              <Table.Th style={{ minWidth: 150 }}>Mahalle</Table.Th>
              {SUTUNLAR.map((sutun) => (
                <Table.Th key={sutun.key} style={{ minWidth: 110, textAlign: 'right' }}>
                  <UnstyledButton
                    onClick={() => basligaTikla(sutun)}
                    style={{ width: '100%', textAlign: 'right' }}
                  >
                    <Text fz={10} fw={siraKey === sutun.key ? 700 : 500} span>
                      {sutun.label}
                      {siraKey === sutun.key ? (artan ? ' ↑' : ' ↓') : ''}
                    </Text>
                  </UnstyledButton>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {sirali.map((karne, index) => {
              const secili = secililer.includes(karne.uavt)
              return (
                <Table.Tr
                  key={karne.uavt}
                  onClick={() => onSec(karne.uavt)}
                  style={{
                    cursor: 'pointer',
                    background: secili ? 'var(--mantine-color-blue-light)' : undefined,
                  }}
                >
                  <Table.Td c="dimmed">{index + 1}</Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <Text fz={11} fw={secili ? 700 : 400} truncate>
                        {karne.ad}
                      </Text>
                      {karne.nufus.sinif ? (
                        <Badge
                          size="xs"
                          variant="light"
                          style={{ background: `${karne.nufus.sinif.color}22`, color: karne.nufus.sinif.color }}
                        >
                          {karne.nufus.sinif.label}
                        </Badge>
                      ) : null}
                    </Group>
                  </Table.Td>
                  {SUTUNLAR.map((sutun) => (
                    <Table.Td key={sutun.key} style={{ textAlign: 'right' }}>
                      <Text className="pafta-veri" fz={11}>
                        {sutun.bicim(karne)}
                      </Text>
                      <Cubuk
                        oran={cubukOrani(sirali, sutun, karne)}
                        renk={
                          sutun.key === siraKey
                            ? 'var(--pafta-aski, #D9A02B)'
                            : 'var(--mantine-color-gray-4)'
                        }
                      />
                    </Table.Td>
                  ))}
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea.Autosize>
    </Stack>
  )
}
