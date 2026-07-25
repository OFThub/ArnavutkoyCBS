// Kimlik denetimi: oturum durumuna göre giriş düğmesi veya kullanıcı menüsü gösterir, giriş modalını yönetir.

import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { isBackendConfigured, signInWithPassword, signOut } from '../lib/supabase'
import { useAppStore } from '../store/appStore'

const ROLE_LABEL: Record<string, string> = {
  public: 'Ziyaretçi',
  personel: 'Personel',
  yonetici: 'Yönetici',
}

export function AuthControl() {
  const role = useAppStore((state) => state.role)
  const session = useAppStore((state) => state.session)
  const [opened, setOpened] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backend = isBackendConfigured()

  const submit = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await signInWithPassword(email.trim(), password)
      setOpened(false)
      setPassword('')
      notifications.show({ color: 'teal', title: 'Giriş', message: 'Oturum açıldı' })
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Giriş başarısız')
    } finally {
      setBusy(false)
    }
  }

  if (session) {
    return (
      <Menu shadow="md" position="bottom-end">
        <Menu.Target>
          <Button size="compact-sm" variant="light">
            <Badge variant="filled" color={role === 'yonetici' ? 'grape' : 'teal'} mr={6}>
              {ROLE_LABEL[role] ?? role}
            </Badge>
            {session.user.email}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{session.user.email}</Menu.Label>
          <Menu.Item onClick={() => void signOut()}>Çıkış yap</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    )
  }

  return (
    <>
      <Group gap="xs" wrap="nowrap">
        <Badge variant="default">{ROLE_LABEL[role] ?? role}</Badge>
        <Button size="compact-sm" variant="light" onClick={() => setOpened(true)} disabled={!backend}>
          Personel girişi
        </Button>
      </Group>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Personel girişi" centered>
        <Stack gap="sm">
          {!backend ? (
            <Alert color="yellow" p="xs">
              <Text size="xs">Sunucu bağlantısı yapılandırılmamış.</Text>
            </Alert>
          ) : null}
          <TextInput
            size="sm"
            label="E-posta"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
          <PasswordInput
            size="sm"
            label="Parola"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submit()
            }}
          />
          {error ? (
            <Alert color="red" p="xs">
              <Text size="xs">{error}</Text>
            </Alert>
          ) : null}
          <Button loading={busy} onClick={() => void submit()} disabled={!backend}>
            Giriş yap
          </Button>
        </Stack>
      </Modal>
    </>
  )
}
