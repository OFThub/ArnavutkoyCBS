// Tezgâh anteti: haritanın sol alt köşesinde ölçek, koordinat, çözünürlük ve veri sürümü.
// Eski StatusBar'ın hesabı aynı; footer yerine haritanın üstünde bir pafta başlık bloğu olarak durur.

import { useEffect, useState } from 'react'
import { ActionIcon, Group, Tooltip, useMantineColorScheme } from '@mantine/core'
import { IconMoon, IconSun } from '@tabler/icons-react'
import { DISTRICT } from '../config/district'
import { formatDecimal } from '../core/coords'
import { loadManifest, type DataManifest } from '../core/dataset'
import { formatDistance, metersPerPixel } from '../core/format'
import { useMapContext } from '../map/mapContext'
import { Antet } from '../theming/Antet'

/** Ekran ölçeği: 96 dpi varsayımıyla 1 piksel ≈ 0.264 mm. */
function scaleDenominator(metersPerPx: number): number {
  return Math.round(metersPerPx / 0.0002646)
}

export function MapAntet() {
  const { map, ready } = useMapContext()
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const [cursor, setCursor] = useState<{ lng: number; lat: number } | null>(null)
  const [zoom, setZoom] = useState(0)
  const [center, setCenter] = useState<{ lat: number } | null>(null)
  const [manifest, setManifest] = useState<DataManifest | null>(null)

  useEffect(() => {
    void loadManifest().then(setManifest)
  }, [])

  useEffect(() => {
    if (!map || !ready) return
    const onMove = (event: { lngLat: { lng: number; lat: number } }): void =>
      setCursor({ lng: event.lngLat.lng, lat: event.lngLat.lat })
    const onZoom = (): void => {
      setZoom(map.getZoom())
      setCenter({ lat: map.getCenter().lat })
    }
    const onLeave = (): void => setCursor(null)

    onZoom()
    map.on('mousemove', onMove)
    map.on('mouseout', onLeave)
    map.on('move', onZoom)

    return () => {
      map.off('mousemove', onMove)
      map.off('mouseout', onLeave)
      map.off('move', onZoom)
    }
  }, [map, ready])

  const enlem = cursor?.lat ?? center?.lat ?? DISTRICT.center[1]
  const cozunurluk = metersPerPixel(enlem, zoom)
  const olcek = scaleDenominator(cozunurluk)

  return (
    <Group gap={6} align="flex-end" wrap="nowrap">
      <Antet
        baslik={`${DISTRICT.name} · Pafta`}
        style={{ minWidth: 216 }}
        satirlar={[
          { etiket: 'Ölçek', deger: `1:${olcek.toLocaleString('tr-TR')}` },
          { etiket: 'Koordinat', deger: cursor ? formatDecimal(cursor.lng, cursor.lat) : '—' },
          { etiket: 'Çözünürlük', deger: `${formatDistance(cozunurluk)}/px · z${zoom.toFixed(1)}` },
          { etiket: 'Veri', deger: manifest?.version?.slice(0, 10) ?? '—' },
        ]}
      />

      <Tooltip label={colorScheme === 'dark' ? 'Aydınlık kip' : 'Karanlık kip'} openDelay={400}>
        <ActionIcon
          variant="default"
          size="lg"
          aria-label="Renk kipini değiştir"
          onClick={toggleColorScheme}
          style={{
            background: 'var(--pafta-yuzey)',
            backdropFilter: 'blur(12px)',
            borderColor: 'var(--pafta-cizgi-koyu)',
          }}
        >
          {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
        </ActionIcon>
      </Tooltip>
    </Group>
  )
}
