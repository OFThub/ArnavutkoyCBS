// Çizilen geometrinin köşe koordinatlarını teker teker girip düzenlemeye açan tablo.
// Harita ile çift yönlü: haritada çizilen köşe tabloya düşer, tabloda yazılan koordinat haritayı günceller.

import { useEffect, useRef, useState } from 'react'
import { ActionIcon, Button, Collapse, Group, ScrollArea, Stack, Table, Text, TextInput, Textarea } from '@mantine/core'
import { parseVertex, parseVertexList, type LngLatPair } from '../../core/imar'

interface Satir {
  lat: string
  lng: string
}

function bicimle(vertices: LngLatPair[]): Satir[] {
  return vertices.map(([lng, lat]) => ({ lat: lat.toFixed(6), lng: lng.toFixed(6) }))
}

function imza(vertices: LngLatPair[]): string {
  return vertices.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join('|')
}

export function VertexTable({
  vertices,
  onChange,
  disabled = false,
}: {
  vertices: LngLatPair[]
  onChange: (next: LngLatPair[]) => void
  disabled?: boolean
}) {
  const [rows, setRows] = useState<Satir[]>(() => bicimle(vertices))
  const [yapistirAcik, setYapistirAcik] = useState(false)
  const [yapistirMetin, setYapistirMetin] = useState('')
  const [yapistirHata, setYapistirHata] = useState<string | null>(null)
  // Tablodan yayınladığımız değer geri geldiğinde satırları sıfırlamamak için son imza tutulur;
  // aksi halde kullanıcı yazarken kutu her tuşta yeniden biçimlenirdi.
  const sonYayin = useRef<string>(imza(vertices))

  useEffect(() => {
    const gelen = imza(vertices)
    if (gelen === sonYayin.current) return
    sonYayin.current = gelen
    setRows(bicimle(vertices))
  }, [vertices])

  const yayinla = (next: Satir[]): void => {
    setRows(next)
    const cozulmus: LngLatPair[] = []
    for (const satir of next) {
      const pair = parseVertex(satir.lat, satir.lng)
      if (pair) cozulmus.push(pair)
    }
    sonYayin.current = imza(cozulmus)
    onChange(cozulmus)
  }

  const guncelle = (index: number, alan: keyof Satir, value: string): void => {
    yayinla(rows.map((satir, i) => (i === index ? { ...satir, [alan]: value } : satir)))
  }

  const sil = (index: number): void => {
    yayinla(rows.filter((_, i) => i !== index))
  }

  const ekle = (): void => {
    // Boş satır yayınlanmaz (parseVertex null döner); kullanıcı doldurunca geometriye katılır.
    setRows([...rows, { lat: '', lng: '' }])
  }

  const yapistir = (): void => {
    const { vertices: cozulmus, hataliSatirlar } = parseVertexList(yapistirMetin)
    if (cozulmus.length === 0) {
      setYapistirHata('Hiçbir satır koordinat olarak okunamadı.')
      return
    }
    setYapistirHata(
      hataliSatirlar.length > 0
        ? `${hataliSatirlar.length} satır okunamadı (satır ${hataliSatirlar.join(', ')}); kalanı alındı.`
        : null,
    )
    yayinla(bicimle(cozulmus))
    setYapistirMetin('')
    if (hataliSatirlar.length === 0) setYapistirAcik(false)
  }

  const gecerliSayisi = rows.filter((satir) => parseVertex(satir.lat, satir.lng) !== null).length

  return (
    <Stack gap={6}>
      <Group justify="space-between" gap="xs">
        <Text fz={10} c="dimmed">
          Köşe koordinatları · {gecerliSayisi} geçerli nokta
        </Text>
        <Button
          size="compact-xs"
          variant="subtle"
          disabled={disabled}
          onClick={() => setYapistirAcik((acik) => !acik)}
        >
          Toplu yapıştır
        </Button>
      </Group>

      <Collapse in={yapistirAcik}>
        <Stack gap={4}>
          <Textarea
            size="xs"
            autosize
            minRows={3}
            maxRows={8}
            placeholder={'41.24840, 28.65540\n41°14\'54.2"K 28°39\'19.4"D'}
            value={yapistirMetin}
            onChange={(event) => setYapistirMetin(event.currentTarget.value)}
          />
          <Text fz={10} c="dimmed">
            Her satır bir köşe. Ondalık derece veya DMS kabul edilir; mevcut köşelerin yerine geçer.
          </Text>
          {yapistirHata ? (
            <Text fz={10} c="yellow.7">
              {yapistirHata}
            </Text>
          ) : null}
          <Button size="compact-xs" disabled={disabled} onClick={yapistir}>
            Köşeleri al
          </Button>
        </Stack>
      </Collapse>

      {rows.length > 0 ? (
        <ScrollArea.Autosize mah={200}>
          <Table fz={10} verticalSpacing={2} withRowBorders={false}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={22} />
                <Table.Th>Enlem</Table.Th>
                <Table.Th>Boylam</Table.Th>
                <Table.Th w={26} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((satir, index) => {
                const gecerli = parseVertex(satir.lat, satir.lng) !== null
                const bos = satir.lat.trim() === '' && satir.lng.trim() === ''
                return (
                  <Table.Tr key={index}>
                    <Table.Td c="dimmed">{index + 1}</Table.Td>
                    <Table.Td>
                      <TextInput
                        size="xs"
                        variant="filled"
                        disabled={disabled}
                        error={!gecerli && !bos}
                        value={satir.lat}
                        placeholder="41.248400"
                        onChange={(event) => guncelle(index, 'lat', event.currentTarget.value)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        size="xs"
                        variant="filled"
                        disabled={disabled}
                        error={!gecerli && !bos}
                        value={satir.lng}
                        placeholder="28.655400"
                        onChange={(event) => guncelle(index, 'lng', event.currentTarget.value)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        disabled={disabled}
                        onClick={() => sil(index)}
                        aria-label={`${index + 1}. köşeyi sil`}
                      >
                        ×
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      ) : (
        <Text fz={10} c="dimmed">
          Haritaya tıklayarak köşe ekleyin ya da aşağıdan elle satır girin.
        </Text>
      )}

      <Button size="compact-xs" variant="light" disabled={disabled} onClick={ekle}>
        + Satır ekle
      </Button>
    </Stack>
  )
}
