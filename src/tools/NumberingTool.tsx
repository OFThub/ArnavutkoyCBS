// Numarataj aracı: mahalle UAVT kodu ve adres bileşenlerinden resmî 20 haneli MAKS-UAVT kodu üretir, doğrular ve dışa aktarır.

import { useState } from 'react'
import { Alert, Button, Code, CopyButton, Group, Select, Stack, Text, TextInput } from '@mantine/core'
import { buildUavtCode, isValidMahalleUavt, parseUavtCode } from '../analysis/core/uavt'
import type { ToolModule } from './types'

const MAHALLELER: { value: string; label: string }[] = [
  { value: '40490', label: 'ADNAN MENDERES' },
  { value: '99358', label: 'MUSTAFA KEMAL PAŞA' },
  { value: '40483', label: 'BOĞAZKÖY İSTİKLAL' },
]

function NumberingPanel() {
  const [mahalle, setMahalle] = useState('40490')
  const [csbm, setCsbm] = useState('')
  const [bina, setBina] = useState('')
  const [bagimsiz, setBagimsiz] = useState('')
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = (): void => {
    try {
      const produced = buildUavtCode({
        mahalleUavt: mahalle,
        csbmKod: csbm || '0',
        binaNo: bina || '0',
        bagimsizBolumNo: bagimsiz || '0',
      })
      setCode(produced)
      setError(null)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Kod üretilemedi')
      setCode(null)
    }
  }

  const parsed = code ? parseUavtCode(code) : null

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Resmî MAKS-UAVT kodu bileşenlerden üretilir: 7 hane mahalle + 5 hane CSBM + 4 hane bina + 4
        hane bağımsız bölüm.
      </Text>

      <Select
        size="xs"
        label="Mahalle (UAVT)"
        data={MAHALLELER}
        value={mahalle}
        onChange={(value) => value && setMahalle(value)}
        searchable
      />

      <Group gap="xs" grow>
        <TextInput size="xs" label="CSBM kodu" value={csbm} onChange={(e) => setCsbm(e.currentTarget.value)} />
        <TextInput size="xs" label="Bina no" value={bina} onChange={(e) => setBina(e.currentTarget.value)} />
      </Group>
      <TextInput
        size="xs"
        label="Bağımsız bölüm no"
        value={bagimsiz}
        onChange={(e) => setBagimsiz(e.currentTarget.value)}
      />

      {!isValidMahalleUavt(mahalle) ? (
        <Alert color="yellow" p="xs">
          <Text size="xs">Mahalle UAVT kodu 4-7 hane olmalı.</Text>
        </Alert>
      ) : null}

      <Button size="xs" onClick={generate}>
        Kod üret
      </Button>

      {error ? (
        <Alert color="red" p="xs">
          <Text size="xs">{error}</Text>
        </Alert>
      ) : null}

      {code ? (
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            Üretilen kod
          </Text>
          <Code block fz={11}>
            {code}
          </Code>
          {parsed ? (
            <Text fz={10} c="dimmed">
              Mahalle {parsed.mahalleUavt} · CSBM {parsed.csbmKod} · Bina {parsed.binaNo} · B.Bölüm{' '}
              {parsed.bagimsizBolumNo}
            </Text>
          ) : null}
          <CopyButton value={code}>
            {({ copied, copy }) => (
              <Button size="xs" variant="light" onClick={copy}>
                {copied ? 'Kopyalandı' : 'Kodu kopyala'}
              </Button>
            )}
          </CopyButton>
        </Stack>
      ) : null}
    </Stack>
  )
}

export const numberingTool: ToolModule = {
  id: 'numarataj',
  title: 'Numarataj',
  description: 'MAKS-UAVT kodu üretir',
  access: 'public',
  Panel: NumberingPanel,
}
