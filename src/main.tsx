// Uygulama giriş noktası: Mantine sağlayıcısı, katman/analiz kayıtları ve oturum dinleyicisi kurulur.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/charts/styles.css'
import './theming/tokens.css'
import App from './App'
import { GuidePage } from './guide/GuidePage'
import { useRoute } from './core/route'
import { ErrorBoundary } from './core/ErrorBoundary'
import { installLayers } from './layers'
import { installAnalyses } from './analysis'
import { installTools } from './tools'
import { currentSession, onAuthChange } from './lib/supabase'
import { registerPwa } from './pwa/registerPwa'
import { useAppStore } from './store/appStore'

// Pafta paleti: kadastro kırmızısı birincil, zeytin ve Terkos mavisi ikincil.
const theme = createTheme({
  primaryColor: 'kadastro',
  colors: {
    kadastro: [
      '#fdf0ee', '#f7d6d1', '#eeaba1', '#e57e70', '#dd5a48',
      '#d84431', '#C8402F', '#b03626', '#9c2f20', '#872718',
    ],
    tarim: [
      '#f3f7ea', '#e3edd0', '#c9dea6', '#adcd78', '#95bf52',
      '#84b53b', '#6E8B3D', '#5f7a2f', '#516a25', '#42571a',
    ],
    su: [
      '#eef6fa', '#d5e8f1', '#a9d0e2', '#79b5d1', '#529fc3',
      '#3a91bb', '#2E6E8E', '#286179', '#215366', '#194454',
    ],
  },
  fontFamily: 'var(--pafta-yazi)',
  fontFamilyMonospace: 'var(--pafta-yazi-veri)',
  headings: { fontFamily: 'var(--pafta-yazi)', fontWeight: '700' },
  defaultRadius: 'sm',
})

function Router() {
  return useRoute() === 'rehber' ? <GuidePage /> : <App />
}

installLayers()
installAnalyses()
installTools()

void currentSession()
  .then((session) => useAppStore.getState().setSession(session))
  .catch(() => useAppStore.getState().setSession(null))

onAuthChange((session) => useAppStore.getState().setSession(session))

registerPwa()

const container = document.getElementById('root')
if (!container) throw new Error('#root bulunamadı')

createRoot(container).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-right" />
      <ErrorBoundary>
        <Router />
      </ErrorBoundary>
    </MantineProvider>
  </StrictMode>,
)
