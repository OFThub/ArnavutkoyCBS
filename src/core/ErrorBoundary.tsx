// Bileşen ağacındaki çalışma zamanı hatalarını yakalayıp uygulamanın tamamının çökmesini önleyen sınır.

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Center, Code, Stack, Text, Title } from '@mantine/core'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Uygulama hatası:', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <Center h="100dvh" p="xl">
        <Stack gap="sm" maw={520}>
          <Title order={3}>Beklenmeyen bir hata oluştu</Title>
          <Text size="sm" c="dimmed">
            Uygulama bir sorunla karşılaştı. Sayfayı yenileyerek devam edebilirsiniz.
          </Text>
          <Code block fz="xs">
            {this.state.error.message}
          </Code>
          <Button onClick={() => window.location.reload()}>Sayfayı yenile</Button>
        </Stack>
      </Center>
    )
  }
}
