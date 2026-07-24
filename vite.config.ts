// Vite yapılandırması: React eklentisi, CORS'suz kamu servisleri için dev proxy, worker ayarları.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    proxy: {
      '/proxy/afad': {
        target: 'https://deprem.afad.gov.tr',
        changeOrigin: true,
        followRedirects: true,
        rewrite: (p) => p.replace(/^\/proxy\/afad/, '/apiv2'),
      },
      '/proxy/overpass': {
        target: 'https://overpass-api.de',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/proxy\/overpass/, '/api/interpreter'),
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
