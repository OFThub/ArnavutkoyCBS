// Katman paneli: kayıtlı katmanları açılır grup ağacında listeler, görünürlük/opaklık yönetir, lejantı açar.

import { useState } from 'react'
import {
  Accordion,
  ActionIcon,
  Box,
  Group,
  Popover,
  Slider,
  Stack,
  Switch,
  Text,
  Tooltip,
} from '@mantine/core'
import { listLayersByGroup } from '../core/layerRegistry'
import type { LayerGroup, LayerModule, LegendItem } from '../core/types'
import { useAppStore } from '../store/appStore'

const GROUP_TITLES: Record<LayerGroup, string> = {
  altlik: 'Altlık',
  topografya: 'Topografya',
  kent: 'Kent',
  mulkiyet: 'Mülkiyet',
  altyapi: 'Altyapı',
  risk: 'Risk',
  demografi: 'Demografi',
}

const DEFAULT_OPACITY = 1

function LegendSwatch({ item }: { item: LegendItem }) {
  const shape = item.shape ?? 'fill'
  return (
    <Box
      w={14}
      h={shape === 'line' ? 3 : 12}
      bg={item.color}
      style={{ borderRadius: shape === 'circle' ? '50%' : 2, flexShrink: 0 }}
    />
  )
}

function OpacityControl({ layer }: { layer: LayerModule }) {
  const opacity = useAppStore((state) => state.layerOpacity[layer.id] ?? DEFAULT_OPACITY)
  const setLayerOpacity = useAppStore((state) => state.setLayerOpacity)

  return (
    <Popover position="left" withArrow shadow="md" width={180}>
      <Popover.Target>
        <Tooltip label={`Opaklık: %${Math.round(opacity * 100)}`} openDelay={400}>
          <ActionIcon size="sm" variant="subtle" color="gray" aria-label={`${layer.title} opaklığı`}>
            <Box
              w={12}
              h={12}
              style={{
                borderRadius: '50%',
                border: '1.5px solid currentColor',
                background: `linear-gradient(90deg, currentColor 50%, transparent 50%)`,
              }}
            />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <Text fz={10} c="dimmed" mb={4}>
          Opaklık %{Math.round(opacity * 100)}
        </Text>
        <Slider
          size="xs"
          min={0}
          max={1}
          step={0.05}
          label={null}
          value={opacity}
          onChange={(value) => setLayerOpacity(layer.id, value)}
        />
      </Popover.Dropdown>
    </Popover>
  )
}

function LayerRow({ layer }: { layer: LayerModule }) {
  const visible = useAppStore((state) => state.visibleLayers.includes(layer.id))
  const toggleLayer = useAppStore((state) => state.toggleLayer)
  const [legendOpen, setLegendOpen] = useState(false)

  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap" align="center">
        <Switch
          size="xs"
          flex={1}
          label={layer.title}
          checked={visible}
          onChange={(event) => toggleLayer(layer.id, event.currentTarget.checked)}
        />
        {layer.legend ? (
          <Tooltip label={legendOpen ? 'Lejantı gizle' : 'Lejantı göster'} openDelay={400}>
            <ActionIcon
              size="sm"
              variant={legendOpen ? 'light' : 'subtle'}
              color="gray"
              aria-label={`${layer.title} lejantı`}
              aria-pressed={legendOpen}
              onClick={() => setLegendOpen((open) => !open)}
            >
              <Text fz={10} fw={700}>
                L
              </Text>
            </ActionIcon>
          </Tooltip>
        ) : null}
        {layer.paintLayers ? <OpacityControl layer={layer} /> : null}
      </Group>

      {legendOpen && layer.legend
        ? layer.legend.map((item) => (
            <Group key={item.label} gap={6} pl="lg" wrap="nowrap">
              <LegendSwatch item={item} />
              <Text fz={10} c="dimmed">
                {item.label}
              </Text>
            </Group>
          ))
        : null}
    </Stack>
  )
}

export function LayerPanel() {
  const role = useAppStore((state) => state.role)
  const visibleLayers = useAppStore((state) => state.visibleLayers)
  const grouped = listLayersByGroup(role)

  if (grouped.size === 0) {
    return (
      <Text size="xs" c="dimmed">
        Bu rolde görüntülenebilir katman yok. Personel hesabıyla girince mülkiyet ve imar
        katmanları listelenir.
      </Text>
    )
  }

  const openGroups = [...grouped.entries()]
    .filter(([, layers]) => layers.some((layer) => visibleLayers.includes(layer.id)))
    .map(([group]) => group)

  return (
    <Accordion
      multiple
      variant="separated"
      chevronPosition="left"
      defaultValue={openGroups.length > 0 ? openGroups : [...grouped.keys()].slice(0, 1)}
    >
      {[...grouped.entries()].map(([group, layers]) => {
        const activeCount = layers.filter((layer) => visibleLayers.includes(layer.id)).length
        return (
          <Accordion.Item key={group} value={group}>
            <Accordion.Control>
              <Group gap={6} wrap="nowrap">
                <Text size="xs" fw={700} tt="uppercase">
                  {GROUP_TITLES[group]}
                </Text>
                <Text fz={10} c="dimmed">
                  {activeCount > 0 ? `${activeCount}/${layers.length}` : layers.length}
                </Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap={6}>
                {layers.map((layer) => (
                  <LayerRow key={layer.id} layer={layer} />
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        )
      })}
    </Accordion>
  )
}
