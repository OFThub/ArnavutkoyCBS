// Uygulama giriş noktası: Mantine sağlayıcısı, katman/analiz kayıtları ve oturum dinleyicisi kurulur.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import App from './App'
import { installLayers } from './layers'
import { installAnalyses } from './analysis'
import { installTools } from './tools'
import { currentSession, onAuthChange } from './lib/supabase'
import { useAppStore } from './store/appStore'

const theme = createTheme({
  primaryColor: 'teal',
  fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
  defaultRadius: 'md',
})

installLayers()
installAnalyses()
installTools()

void currentSession()
  .then((session) => useAppStore.getState().setSession(session))
  .catch(() => useAppStore.getState().setSession(null))

onAuthChange((session) => useAppStore.getState().setSession(session))

const container = document.getElementById('root')
if (!container) throw new Error('#root bulunamadı')

createRoot(container).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-right" />
      <App />
    </MantineProvider>
  </StrictMode>,
)
