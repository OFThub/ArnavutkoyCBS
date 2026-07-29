// Araç çubuğu ve etkin araç paneli: kayıtlı araçları listeler, seçileni bağlar ve kapatır.

import type { ComponentType } from 'react'
import { Card, CloseButton, Group, SimpleGrid, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core'
import {
  IconArrowsMove,
  IconChartAreaLine,
  IconCircleDashed,
  IconCrosshair,
  IconDeviceDesktopAnalytics,
  IconFileUpload,
  IconGauge,
  IconInfoCircle,
  IconMountain,
  IconNumbers,
  IconPanoramaHorizontal,
  IconPencil,
  IconPrinter,
  IconShare,
  IconTool,
  IconDeviceMobile,
} from '@tabler/icons-react'
import { listTools } from '../tools/registry'
import { useAppStore } from '../store/appStore'

type Icon = ComponentType<{ size?: number; stroke?: number }>

// Araç kimliği → ikon. Modüllerin UI bağımlılığı olmasın diye eşleme tek yerde durur.
const ICONS: Record<string, Icon> = {
  bilgi: IconInfoCircle,
  olcum: IconArrowsMove,
  tampon: IconCircleDashed,
  cizim: IconPencil,
  arazi: IconMountain,
  profil: IconChartAreaLine,
  koordinat: IconCrosshair,
  paylas: IconShare,
  numarataj: IconNumbers,
  panorama: IconPanoramaHorizontal,
  'calisma-alani': IconDeviceDesktopAnalytics,
  'veri-ice-aktar': IconFileUpload,
  saha: IconDeviceMobile,
  basarim: IconGauge,
  yazdir: IconPrinter,
}

export function ToolDock() {
  const role = useAppStore((state) => state.role)
  const activeToolId = useAppStore((state) => state.activeToolId)
  const setActiveTool = useAppStore((state) => state.setActiveTool)
  const tools = listTools(role)
  const active = tools.find((tool) => tool.id === activeToolId)

  if (tools.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        Bu rolde kullanılabilir araç yok. Personel hesabıyla girince ölçüm ve veri araçları açılır.
      </Text>
    )
  }

  return (
    <Stack gap="sm">
      <SimpleGrid cols={4} spacing={6}>
        {tools.map((tool) => {
          const Icon = ICONS[tool.id] ?? IconTool
          const secili = tool.id === activeToolId
          return (
            <Tooltip key={tool.id} label={tool.title} openDelay={300} withArrow>
              <UnstyledButton
                aria-label={tool.title}
                aria-pressed={secili}
                onClick={() => setActiveTool(secili ? null : tool.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 2px',
                  minHeight: 58,
                  borderRadius: 'var(--pafta-radius)',
                  border: `1px solid ${secili ? 'var(--pafta-kadastro)' : 'var(--pafta-cizgi)'}`,
                  background: secili ? 'var(--pafta-kadastro)' : 'transparent',
                  color: secili ? '#fff' : 'var(--pafta-metin)',
                  transition: 'background var(--pafta-gecis), border-color var(--pafta-gecis)',
                }}
              >
                <Icon size={20} stroke={1.6} />
                <Text fz={9} ta="center" lh={1.15} lineClamp={2}>
                  {tool.title}
                </Text>
              </UnstyledButton>
            </Tooltip>
          )
        })}
      </SimpleGrid>

      {active ? (
        <Card withBorder radius="sm" padding="sm">
          <Stack gap="sm">
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Stack gap={0}>
                <Text className="pafta-baslik" size="sm">
                  {active.title}
                </Text>
                <Text fz={10} c="dimmed">
                  {active.description}
                </Text>
              </Stack>
              <CloseButton size="sm" aria-label="Aracı kapat" onClick={() => setActiveTool(null)} />
            </Group>
            <active.Panel />
          </Stack>
        </Card>
      ) : null}
    </Stack>
  )
}
