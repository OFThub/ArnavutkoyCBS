// Konum paylaşma aracı: harita durumunu kodlayan kalıcı bağlantıyı üretir ve panoya kopyalar.

import { useEffect, useState } from 'react'
import { Button, Code, CopyButton, Stack, Text } from '@mantine/core'
import { shareUrl } from '../core/mapState'
import { useMapContext } from '../map/mapContext'
import { currentMapState } from '../map/useMapStateSync'
import { useAppStore } from '../store/appStore'
import type { ToolModule } from './types'

function SharePanel() {
  const { map, ready } = useMapContext()
  const basemap = useAppStore((state) => state.basemap)
  const visibleLayers = useAppStore((state) => state.visibleLayers)
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!map || !ready) return
    const update = (): void => setUrl(shareUrl(currentMapState(map)))
    update()
    map.on('moveend', update)
    return () => {
      map.off('moveend', update)
    }
  }, [map, ready, basemap, visibleLayers])

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Bağlantı harita merkezini, yakınlaştırmayı, dönüş ve eğimi, seçili altlığı ve açık katmanları
        taşır. Açan kişi aynı görünümü görür.
      </Text>

      <Code block fz={10}>
        {url || '—'}
      </Code>

      <CopyButton value={url}>
        {({ copied, copy }) => (
          <Button size="xs" fullWidth disabled={!url} onClick={copy}>
            {copied ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
          </Button>
        )}
      </CopyButton>
    </Stack>
  )
}

export const shareTool: ToolModule = {
  id: 'paylas',
  title: 'Paylaş',
  description: 'Harita durumunu bağlantıya kodlar',
  access: 'public',
  Panel: SharePanel,
}
