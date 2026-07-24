// Uygulama kabuğu ve Faz 0 hazırlık göstergesi; harita katmanı Faz 1'de bu kabuğun içine yerleşir.

import { useEffect, useState } from 'react'
import { AppShell, Badge, Card, Container, Group, List, Stack, Text, Title } from '@mantine/core'
import { DISTRICT } from './config/district'
import { loadManifest, type DataManifest } from './core/dataset'
import { isBackendConfigured } from './lib/supabase'
import { listLayers } from './core/layerRegistry'
import { listAnalyses } from './core/analysisRegistry'
import { useAppStore } from './store/appStore'

export default function App() {
  const role = useAppStore((state) => state.role)
  const [manifest, setManifest] = useState<DataManifest | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let alive = true
    void loadManifest().then((value) => {
      if (!alive) return
      setManifest(value)
      setChecked(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const backendReady = isBackendConfigured()
  const dataReady = manifest !== null
  const layerCount = listLayers(role).length
  const analysisCount = listAnalyses(role).length

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Title order={4}>{DISTRICT.name} CBS</Title>
            <Badge variant="light">{DISTRICT.province}</Badge>
          </Group>
          <Badge variant={role === 'public' ? 'default' : 'filled'}>{role}</Badge>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="sm">
          <Stack gap="md">
            <Card withBorder radius="md" padding="lg">
              <Stack gap="sm">
                <Title order={5}>Faz 0 — Temel</Title>
                <Text size="sm" c="dimmed">
                  Proje iskeleti, veri hattı ve veritabanı şeması hazırlanıyor. Harita Faz 1'de
                  devreye girer.
                </Text>
                <List size="sm" spacing="xs">
                  <List.Item>
                    <Group gap="xs">
                      <Badge color={dataReady ? 'teal' : 'gray'} variant="light">
                        {checked ? (dataReady ? 'hazır' : 'yok') : 'kontrol'}
                      </Badge>
                      <Text size="sm">
                        Veri seti{' '}
                        {manifest ? `sürüm ${manifest.version}` : '— npm run data:build çalıştırın'}
                      </Text>
                    </Group>
                  </List.Item>
                  <List.Item>
                    <Group gap="xs">
                      <Badge color={backendReady ? 'teal' : 'gray'} variant="light">
                        {backendReady ? 'hazır' : 'yok'}
                      </Badge>
                      <Text size="sm">
                        Supabase {backendReady ? 'bağlı' : '— .env dosyasını doldurun'}
                      </Text>
                    </Group>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">
                      Kayıtlı katman: {layerCount} · Kayıtlı analiz: {analysisCount}
                    </Text>
                  </List.Item>
                </List>
              </Stack>
            </Card>

            <Card withBorder radius="md" padding="lg">
              <Stack gap="xs">
                <Title order={6}>İlçe referansları</Title>
                <Text size="sm">OSM relation: {DISTRICT.osmRelationId}</Text>
                <Text size="sm">bbox: {DISTRICT.bbox.join(', ')}</Text>
                <Text size="sm">
                  Mahalle sayısı: {DISTRICT.mahalleCount} · Merkez yükselti referansı:{' '}
                  {DISTRICT.referenceElevationM} m
                </Text>
              </Stack>
            </Card>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
