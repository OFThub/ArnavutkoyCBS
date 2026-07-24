// Katman paneli: kayıtlı katmanları gruplayarak listeler, görünürlüklerini açar ve lejantı gösterir.

import { Box, Group, Stack, Switch, Text } from '@mantine/core'
import { listLayersByGroup } from '../core/layerRegistry'
import type { LayerGroup, LegendItem } from '../core/types'
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

export function LayerPanel() {
  const role = useAppStore((state) => state.role)
  const visibleLayers = useAppStore((state) => state.visibleLayers)
  const toggleLayer = useAppStore((state) => state.toggleLayer)
  const grouped = listLayersByGroup(role)

  if (grouped.size === 0) {
    return (
      <Text size="xs" c="dimmed">
        Kayıtlı katman yok.
      </Text>
    )
  }

  return (
    <Stack gap="sm">
      {[...grouped.entries()].map(([group, layers]) => (
        <Stack key={group} gap={6}>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            {GROUP_TITLES[group]}
          </Text>
          {layers.map((layer) => (
            <Stack key={layer.id} gap={4}>
              <Switch
                size="xs"
                label={layer.title}
                checked={visibleLayers.includes(layer.id)}
                onChange={(event) => toggleLayer(layer.id, event.currentTarget.checked)}
              />
              {visibleLayers.includes(layer.id) && layer.legend
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
          ))}
        </Stack>
      ))}
    </Stack>
  )
}
