// Kimlik denetimi: oturum durumuna göre giriş düğmesi veya kullanıcı menüsü gösterir, giriş modalını yönetir.

import { useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
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
          <Button size="compact-sm" variant="default">
            <Badge variant="filled" color={role === 'yonetici' ? 'su' : 'tarim'} mr={6}>
              {ROLE_LABEL[role] ?? role}
            </Badge>
            <Box component="span" visibleFrom="sm">
              {session.user.email}
            </Box>
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
      {/* Rol rozeti yok: "Personel girişi" düğmesini gören zaten ziyaretçi. */}
      <Button
        size="compact-sm"
        variant="default"
        onClick={() => setOpened(true)}
        disabled={!backend}
        title={backend ? undefined : 'Sunucu bağlantısı yapılandırılmamış'}
      >
        <Box component="span" visibleFrom="sm">
          Personel girişi
        </Box>
        <Box component="span" hiddenFrom="sm">
          Giriş
        </Box>
      </Button>

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
