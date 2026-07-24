// Araç panellerinde ölçüm ve sonuç değerlerini tek biçimde gösteren küçük metrik listesi.

import { Group, Paper, Stack, Text } from '@mantine/core'

export interface ToolMetricItem {
  label: string
  value: string
}

export function ToolMetrics({ items }: { items: ToolMetricItem[] }) {
  return (
    <Paper withBorder radius="sm" p="xs">
      <Stack gap={4}>
        {items.map((item) => (
          <Group key={item.label} justify="space-between" gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed">
              {item.label}
            </Text>
            <Text size="xs" fw={600}>
              {item.value}
            </Text>
          </Group>
        ))}
      </Stack>
    </Paper>
  )
}
