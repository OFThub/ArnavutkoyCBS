// Uygulama kabuğu: harita tam ekran, arayüz haritanın üstüne çizilen enstrümanlar.
// Masaüstünde sol ray + kayan panel, mobilde alt ray + alttan çıkan sayfa.

import { useEffect, useState } from 'react'
import {
  Box,
  CloseButton,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { DISTRICT } from './config/district'
import { MapCanvas } from './map/MapCanvas'
import { MapProvider } from './map/MapProvider'
import { useLayerHost } from './map/useLayerHost'
import { useMapStateSync } from './map/useMapStateSync'
import { useBuildingSync } from './map/useBuildingSync'
import { useSketchOverlay } from './map/useSketchOverlay'
import { useTerrainSync } from './map/useTerrainSync'
import { useWorkAreaBounds } from './map/useWorkAreaBounds'
import { AuthControl } from './auth/AuthControl'
import { AnalysisDock } from './panels/AnalysisDock'
import { MapAntet } from './panels/Antet'
import { DashboardPanel } from './panels/DashboardPanel'
import { BasemapSwitcher } from './panels/BasemapSwitcher'
import { LayerPanel } from './panels/LayerPanel'
import { Rail, RAIL_ITEMS, type PanelId } from './panels/Rail'
import { SearchBox } from './panels/SearchBox'
import { ThematicPanel } from './theming/ThematicPanel'
import { ToolDock } from './panels/ToolDock'

function PanelContent({ id }: { id: PanelId }) {
  if (id === 'katmanlar') {
    return (
      <Stack gap="md">
        <BasemapSwitcher />
        <LayerPanel />
      </Stack>
    )
  }
  if (id === 'araclar') return <ToolDock />
  if (id === 'analiz') return <AnalysisDock />
  return (
    <Stack gap="md">
      <Divider label="Tematik harita" labelPosition="left" />
      <ThematicPanel />
      <Divider label="BI panosu" labelPosition="left" />
      <DashboardPanel />
    </Stack>
  )
}

function SidePanel({
  id,
  onClose,
  mobil,
}: {
  id: PanelId
  onClose: () => void
  mobil: boolean
}) {
  const baslik = RAIL_ITEMS.find((item) => item.id === id)?.label ?? ''

  return (
    <Box
      aria-label={baslik}
      style={{
        position: mobil ? 'absolute' : 'relative',
        insetInline: mobil ? 0 : undefined,
        bottom: mobil ? 0 : undefined,
        zIndex: 5,
        width: mobil ? '100%' : 'var(--pafta-panel)',
        height: mobil ? '58dvh' : '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pafta-yuzey)',
        backdropFilter: 'blur(12px)',
        borderRight: mobil ? 'none' : '1px solid var(--pafta-cizgi)',
        borderTop: mobil ? '1px solid var(--pafta-cizgi-koyu)' : 'none',
        borderRadius: mobil ? 'var(--pafta-radius) var(--pafta-radius) 0 0' : 0,
      }}
    >
      <Group
        justify="space-between"
        px="sm"
        py={8}
        wrap="nowrap"
        style={{ borderBottom: '1px solid var(--pafta-cizgi)' }}
      >
        <Text className="pafta-baslik" fz="xs" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
          {baslik}
        </Text>
        <CloseButton size="sm" aria-label={`${baslik} panelini kapat`} onClick={onClose} />
      </Group>

      <ScrollArea type="auto" style={{ flex: 1 }} p="sm">
        <PanelContent id={id} />
      </ScrollArea>
    </Box>
  )
}

function Workbench() {
  const mobil = useMediaQuery('(max-width: 48em)') ?? false
  const [acik, setAcik] = useState<PanelId | null>('katmanlar')

  useLayerHost()
  useMapStateSync()
  useSketchOverlay()
  useTerrainSync()
  useBuildingSync()
  useWorkAreaBounds()

  // Esc paneli kapatır; harita üstünde kalıcı bölge olduğu için dialog değil.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setAcik(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: mobil ? 'column-reverse' : 'row',
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
        background: 'var(--pafta-yuzey-duz)',
      }}
    >
      <Rail active={acik} onSelect={setAcik} mobil={mobil} />

      {!mobil && acik ? <SidePanel id={acik} mobil={false} onClose={() => setAcik(null)} /> : null}

      <Box style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0 }}>
        <MapCanvas />

        {/* Üst şerit: kimlik, arama ve oturum tek satırda. Haritanın kendi kontrolleri sağda kalır. */}
        <Group
          gap="sm"
          wrap="nowrap"
          align="flex-start"
          justify="space-between"
          style={{ position: 'absolute', top: 12, left: 12, right: 52, zIndex: 4 }}
        >
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            <Box
              px="sm"
              py={6}
              style={{
                background: 'var(--pafta-yuzey)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--pafta-cizgi-koyu)',
                borderRadius: 'var(--pafta-radius)',
                flexShrink: 0,
              }}
              visibleFrom="md"
            >
              <Title order={1} className="pafta-baslik" fz={13} tt="uppercase" lh={1.2}>
                {DISTRICT.name} CBS
              </Title>
              <Text className="pafta-antet__etiket">{DISTRICT.province}</Text>
            </Box>
            <SearchBox />
          </Group>

          <Box style={{ flexShrink: 0 }}>
            <AuthControl />
          </Box>
        </Group>

        <Box
          style={{ position: 'absolute', left: 12, bottom: 34, zIndex: 4 }}
          visibleFrom="xs"
        >
          <MapAntet />
        </Box>

        {mobil && acik ? <SidePanel id={acik} mobil onClose={() => setAcik(null)} /> : null}
      </Box>
    </Box>
  )
}

export default function App() {
  return (
    <MapProvider>
      <Workbench />
    </MapProvider>
  )
}
