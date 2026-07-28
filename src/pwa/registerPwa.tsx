// Service worker kaydı: yeni sürüm hazır olduğunda kullanıcıya yenileme sorar, çevrimdışı hazırlığı bildirir.

import { Button, Group, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'

const UPDATE_ID = 'pwa-guncelleme'
const OFFLINE_ID = 'pwa-cevrimdisi'

export function registerPwa(): void {
  if (import.meta.env.DEV) return
  if (!('serviceWorker' in navigator)) return

  void import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,

        onNeedRefresh() {
          notifications.show({
            id: UPDATE_ID,
            withCloseButton: true,
            autoClose: false,
            color: 'teal',
            title: 'Yeni sürüm hazır',
            message: (
              <Stack gap="xs">
                <Text size="xs">
                  Uygulamanın güncel sürümü indirildi. Yenileyerek geçebilirsiniz.
                </Text>
                <Group gap="xs">
                  <Button size="compact-xs" onClick={() => void updateSW(true)}>
                    Yenile
                  </Button>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    onClick={() => notifications.hide(UPDATE_ID)}
                  >
                    Sonra
                  </Button>
                </Group>
              </Stack>
            ),
          })
        },

        onOfflineReady() {
          notifications.show({
            id: OFFLINE_ID,
            color: 'teal',
            title: 'Çevrimdışı kullanıma hazır',
            message: 'Uygulama artık bağlantı olmadan da açılıyor.',
            autoClose: 6000,
          })
        },

        onRegisterError(error: unknown) {
          console.error('Service worker kaydı başarısız:', error)
        },
      })
    })
    .catch((error: unknown) => {
      console.error('Service worker modülü yüklenemedi:', error)
    })
}
