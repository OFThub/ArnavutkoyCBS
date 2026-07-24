// Çalışma alanı aracı: harita görünümünü, altlığı, açık katmanları ve çizimleri adlandırıp kaydeder ve geri yükler.

import { useEffect, useState } from 'react'
import { ActionIcon, Button, Group, ScrollArea, Stack, Text, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  deleteWorkspace,
  listWorkspaces,
  saveWorkspace,
  type Workspace,
} from '../core/workspace'
import { useMapContext } from '../map/mapContext'
import { currentMapState } from '../map/useMapStateSync'
import { useAppStore } from '../store/appStore'
import type { ToolModule } from './types'

function WorkspacePanel() {
  const { map, ready } = useMapContext()
  const [name, setName] = useState('')
  const [items, setItems] = useState<Workspace[]>([])
  const sketch = useAppStore((state) => state.sketch)

  useEffect(() => {
    void listWorkspaces().then(setItems)
  }, [])

  const save = async (): Promise<void> => {
    if (!map || !ready) return
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    const next = await saveWorkspace({
      id: `ca-${Date.now().toString(36)}`,
      name: trimmed,
      savedAt: new Date().toISOString(),
      state: currentMapState(map),
      sketch,
    })
    setItems(next)
    setName('')
    notifications.show({ color: 'teal', title: 'Çalışma alanı', message: `${trimmed} kaydedildi` })
  }

  const restore = (workspace: Workspace): void => {
    if (!map) return
    const store = useAppStore.getState()
    store.setBasemap(workspace.state.basemap)
    store.setVisibleLayers(workspace.state.layers)
    store.setSketch(workspace.sketch)
    map.jumpTo({
      center: [workspace.state.lng, workspace.state.lat],
      zoom: workspace.state.zoom,
      bearing: workspace.state.bearing,
      pitch: workspace.state.pitch,
    })
  }

  const remove = async (id: string): Promise<void> => {
    setItems(await deleteWorkspace(id))
  }

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Görünüm, altlık, açık katmanlar ve çizimler bu tarayıcıda saklanır.
      </Text>

      <TextInput
        size="xs"
        label="Ad"
        placeholder="Örn. Taşoluk saha çalışması"
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void save()
        }}
      />

      <Button size="xs" disabled={name.trim().length === 0} onClick={() => void save()}>
        Kaydet
      </Button>

      {items.length > 0 ? (
        <ScrollArea.Autosize mah={240}>
          <Stack gap={6}>
            {items.map((item) => (
              <Group key={item.id} justify="space-between" gap="xs" wrap="nowrap">
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                  <Text size="xs" fw={600} truncate>
                    {item.name}
                  </Text>
                  <Text fz={10} c="dimmed">
                    {new Date(item.savedAt).toLocaleString('tr-TR')}
                  </Text>
                </Stack>
                <Button size="compact-xs" variant="light" onClick={() => restore(item)}>
                  Yükle
                </Button>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={() => void remove(item.id)}
                >
                  ×
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      ) : (
        <Text size="xs" c="dimmed">
          Kayıtlı çalışma alanı yok.
        </Text>
      )}
    </Stack>
  )
}

export const workspaceTool: ToolModule = {
  id: 'calisma-alani',
  title: 'Çalışma alanı',
  description: 'Görünümü kaydeder ve geri yükler',
  access: 'public',
  Panel: WorkspacePanel,
}
