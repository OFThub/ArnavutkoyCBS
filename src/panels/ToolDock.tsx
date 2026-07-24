// Araç çubuğu ve etkin araç paneli: kayıtlı araçları listeler, seçileni bağlar ve kapatır.

import { Button, Card, CloseButton, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import { listTools } from '../tools/registry'
import { useAppStore } from '../store/appStore'

export function ToolDock() {
  const role = useAppStore((state) => state.role)
  const activeToolId = useAppStore((state) => state.activeToolId)
  const setActiveTool = useAppStore((state) => state.setActiveTool)
  const tools = listTools(role)
  const active = tools.find((tool) => tool.id === activeToolId)

  return (
    <Stack gap="sm">
      <SimpleGrid cols={2} spacing={6}>
        {tools.map((tool) => (
          <Button
            key={tool.id}
            size="compact-sm"
            variant={tool.id === activeToolId ? 'filled' : 'light'}
            onClick={() => setActiveTool(tool.id === activeToolId ? null : tool.id)}
          >
            {tool.title}
          </Button>
        ))}
      </SimpleGrid>

      {active ? (
        <Card withBorder radius="sm" padding="sm">
          <Stack gap="sm">
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Stack gap={0}>
                <Text size="sm" fw={700}>
                  {active.title}
                </Text>
                <Text fz={10} c="dimmed">
                  {active.description}
                </Text>
              </Stack>
              <CloseButton size="sm" onClick={() => setActiveTool(null)} />
            </Group>
            <active.Panel />
          </Stack>
        </Card>
      ) : null}
    </Stack>
  )
}
