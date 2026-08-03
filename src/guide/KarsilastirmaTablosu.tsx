// Seçilen 2-3 mahallenin karnesi yan yana. Her satırda yönlü göstergelerin en iyisi vurgulanır;
// nüfus göstergelerinde kazanan seçilmez, sadece değer ve yoğunluk sınıfı gösterilir.

import { Fragment } from 'react'
import { Badge, Group, Paper, ScrollArea, Stack, Table, Text } from '@mantine/core'
import { oranEtiketi } from '../core/nufus'
import { GRUP_ADI, METRIKLER, enIyiler, type MetrikGrubu } from './karsilastirma'
import type { MahalleKarne } from './guideScore'

const GRUP_SIRASI: MetrikGrubu[] = ['puan', 'nufus', 'deprem', 'erisim', 'hizmet', 'altyapi']

export function KarsilastirmaTablosu({ karneler }: { karneler: MahalleKarne[] }) {
  if (karneler.length < 2) {
    return (
      <Paper withBorder radius="sm" p="md">
        <Text fz="sm" c="dimmed">
          Karşılaştırmak için yukarıdaki tablodan en az iki mahalle seçin.
        </Text>
      </Paper>
    )
  }

  return (
    <Paper withBorder radius="sm" p={0}>
      <ScrollArea type="auto">
        <Table fz={11} verticalSpacing={5} horizontalSpacing="sm" withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ minWidth: 170 }}>Gösterge</Table.Th>
              {karneler.map((karne) => (
                <Table.Th key={karne.uavt} style={{ minWidth: 130, textAlign: 'right' }}>
                  <Stack gap={2} align="flex-end">
                    <Text fz={11} fw={700}>
                      {karne.ad}
                    </Text>
                    {karne.nufus.sinif ? (
                      <Badge
                        size="xs"
                        variant="light"
                        style={{
                          background: `${karne.nufus.sinif.color}22`,
                          color: karne.nufus.sinif.color,
                        }}
                      >
                        {karne.nufus.sinif.label}
                      </Badge>
                    ) : null}
                  </Stack>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {GRUP_SIRASI.map((grup) => {
              const metrikler = METRIKLER.filter((metrik) => metrik.grup === grup)
              if (metrikler.length === 0) return null

              // Fragment kullanılır: tbody içine tbody geçersiz HTML, tarayıcı sütun hizasını bozuyor.
              return (
                <Fragment key={grup}>
                  <Table.Tr>
                    <Table.Td colSpan={karneler.length + 1} style={{ padding: '10px 12px 4px' }}>
                      <Text className="pafta-baslik" fz={10} tt="uppercase" c="dimmed">
                        {GRUP_ADI[grup]}
                        {grup === 'nufus' ? ' · puanlanmaz' : ''}
                      </Text>
                    </Table.Td>
                  </Table.Tr>

                  {metrikler.map((metrik) => {
                    const kazananlar = enIyiler(karneler, metrik)
                    return (
                      <Table.Tr key={metrik.key}>
                        <Table.Td c="dimmed">{metrik.label}</Table.Td>
                        {karneler.map((karne) => {
                          const kazandi = kazananlar.includes(karne.uavt)
                          return (
                            <Table.Td key={karne.uavt} style={{ textAlign: 'right' }}>
                              <Group gap={4} justify="flex-end" wrap="nowrap">
                                <Text
                                  className="pafta-veri"
                                  fz={11}
                                  fw={kazandi ? 700 : 400}
                                  c={kazandi ? 'var(--pafta-tarim, #6E8B3D)' : 'inherit'}
                                >
                                  {metrik.bicim(karne)}
                                </Text>
                                {kazandi ? (
                                  <Text
                                    fz={10}
                                    c="var(--pafta-tarim, #6E8B3D)"
                                    aria-label="bu göstergede en iyi"
                                  >
                                    ▲
                                  </Text>
                                ) : null}
                              </Group>
                            </Table.Td>
                          )
                        })}
                      </Table.Tr>
                    )
                  })}

                  {grup === 'nufus' ? (
                    <Table.Tr>
                      <Table.Td c="dimmed">İlçe ortalamasına göre</Table.Td>
                      {karneler.map((karne) => (
                        <Table.Td key={karne.uavt} style={{ textAlign: 'right' }}>
                          <Text fz={10} c="dimmed">
                            {oranEtiketi(karne.nufus.ilceOrani)}
                          </Text>
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  ) : null}
                </Fragment>
              )
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Text fz={10} c="dimmed" p="xs">
        ▲ o göstergede en iyi değer. Nüfus ve alan göstergeleri puanlanmaz — yüksek yoğunluk
        objektif olarak iyi ya da kötü değildir, genel puana da girmez.
      </Text>
    </Paper>
  )
}
