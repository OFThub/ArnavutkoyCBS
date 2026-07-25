// Uygulama kabuğu: harita sağlayıcısını, katman/araç panellerini ve durum çubuğunu bir araya getirir.

import { AppShell, Badge, Box, Burger, Divider, Group, ScrollArea, Stack, Tabs, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
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
import { DashboardPanel } from './panels/DashboardPanel'
import { BasemapSwitcher } from './panels/BasemapSwitcher'
import { LayerPanel } from './panels/LayerPanel'
import { ThematicPanel } from './theming/ThematicPanel'
import { StatusBar } from './panels/StatusBar'
import { ToolDock } from './panels/ToolDock'

const MAP_HEIGHT =
  'calc(100dvh - var(--app-shell-header-height) - var(--app-shell-footer-height))'

function Workbench() {
  const [opened, { toggle }] = useDisclosure(true)

  useLayerHost()
  useMapStateSync()
  useSketchOverlay()
  useTerrainSync()
  useBuildingSync()
  useWorkAreaBounds()

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 320, breakpoint: 'sm', collapsed: { mobile: !opened, desktop: !opened } }}
      footer={{ height: 30 }}
      padding={0}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} size="sm" />
            <Title order={4}>{DISTRICT.name} CBS</Title>
            <Badge variant="light" visibleFrom="sm">
              {DISTRICT.province}
            </Badge>
          </Group>
          <AuthControl />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <Tabs defaultValue="katmanlar" h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
          <Tabs.List grow>
            <Tabs.Tab value="katmanlar" fz="xs">
              Katmanlar
            </Tabs.Tab>
            <Tabs.Tab value="araclar" fz="xs">
              Araçlar
            </Tabs.Tab>
            <Tabs.Tab value="analiz" fz="xs">
              Analiz
            </Tabs.Tab>
            <Tabs.Tab value="pano" fz="xs">
              Pano
            </Tabs.Tab>
          </Tabs.List>

          <ScrollArea type="auto" style={{ flex: 1 }} pt="sm">
            <Tabs.Panel value="katmanlar">
              <Stack gap="md">
                <BasemapSwitcher />
                <LayerPanel />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="araclar">
              <ToolDock />
            </Tabs.Panel>
            <Tabs.Panel value="analiz">
              <AnalysisDock />
            </Tabs.Panel>
            <Tabs.Panel value="pano">
              <Stack gap="md">
                <Divider label="Tematik harita" labelPosition="left" />
                <ThematicPanel />
                <Divider label="BI panosu" labelPosition="left" />
                <DashboardPanel />
              </Stack>
            </Tabs.Panel>
          </ScrollArea>
        </Tabs>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box h={MAP_HEIGHT}>
          <MapCanvas />
        </Box>
      </AppShell.Main>

      <AppShell.Footer>
        <StatusBar />
      </AppShell.Footer>
    </AppShell>
  )
}

export default function App() {
  return (
    <MapProvider>
      <Workbench />
    </MapProvider>
  )
}
