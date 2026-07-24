// Yazdırma aracı: geçerli harita görünümünü başlık, ölçek ve künyeyle A4 PDF olarak dışa aktarır.

import { useState } from 'react'
import { Button, SegmentedControl, Stack, Text, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { DISTRICT } from '../config/district'
import { dataVersion } from '../core/dataset'
import { useMapContext } from '../map/mapContext'
import { exportMapPdf, type PrintOrientation } from './print'
import type { ToolModule } from './types'

function PrintPanel() {
  const { map, ready } = useMapContext()
  const [title, setTitle] = useState(`${DISTRICT.name} CBS haritası`)
  const [orientation, setOrientation] = useState<PrintOrientation>('landscape')
  const [busy, setBusy] = useState(false)

  const run = async (): Promise<void> => {
    if (!map || !ready) return
    setBusy(true)
    try {
      const fileName = await exportMapPdf(map, {
        title: title.trim() || DISTRICT.name,
        orientation,
        dataVersion: await dataVersion(),
      })
      notifications.show({ color: 'teal', title: 'Yazdırma', message: `${fileName} indirildi` })
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Yazdırma',
        message: error instanceof Error ? error.message : 'PDF üretilemedi',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap="sm">
      <TextInput
        size="xs"
        label="Başlık"
        value={title}
        onChange={(event) => setTitle(event.currentTarget.value)}
      />

      <SegmentedControl
        fullWidth
        size="xs"
        value={orientation}
        onChange={(value) => setOrientation(value as PrintOrientation)}
        data={[
          { value: 'landscape', label: 'Yatay' },
          { value: 'portrait', label: 'Dikey' },
        ]}
      />

      <Text size="xs" c="dimmed">
        Çıktı, ekrandaki görünümü ölçek çubuğu, merkez koordinatı, veri sürümü ve kaynak künyesiyle
        birlikte alır.
      </Text>

      <Button size="xs" loading={busy} onClick={() => void run()}>
        PDF oluştur
      </Button>
    </Stack>
  )
}

export const printTool: ToolModule = {
  id: 'yazdir',
  title: 'Yazdır',
  description: 'Görünümü A4 PDF olarak indirir',
  access: 'public',
  Panel: PrintPanel,
}
