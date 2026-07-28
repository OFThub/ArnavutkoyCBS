// Vite yapılandırması: React eklentisi, CORS'suz kamu servisleri için dev proxy, worker ve PWA çevrimdışı önbellek ayarları.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const YIL = 60 * 60 * 24 * 365
const HAFTA = 60 * 60 * 24 * 7

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icons/icon-180.png'],
      manifest: {
        name: 'Arnavutköy Belediyesi CBS',
        short_name: 'Arnavutköy CBS',
        description:
          'Arnavutköy ilçesinin coğrafi bilgi sistemi: harita, topografya, kent envanteri ve analizler.',
        lang: 'tr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0f172a',
        theme_color: '#0d9488',
        categories: ['government', 'navigation', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        globIgnores: ['**/*.map', '**/data/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/proxy\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/data/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cbs-veri',
              expiration: { maxEntries: 32, maxAgeSeconds: YIL },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/icons/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'cbs-ikon',
              expiration: { maxEntries: 8, maxAgeSeconds: YIL },
            },
          },
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/(styles|fonts|sprites)\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'altlik-stil',
              expiration: { maxEntries: 64, maxAgeSeconds: HAFTA },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/planet/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'altlik-vektor-dosemesi',
              expiration: { maxEntries: 600, maxAgeSeconds: HAFTA },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/s3\.amazonaws\.com\/elevation-tiles-prod\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'yukselti-dosemesi',
              expiration: { maxEntries: 300, maxAgeSeconds: YIL },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/(server\.arcgisonline\.com|tile\.opentopomap\.org)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'raster-altlik-dosemesi',
              expiration: { maxEntries: 400, maxAgeSeconds: HAFTA },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
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
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'maplibre', test: /[\\/]node_modules[\\/]maplibre-gl[\\/]/ },
            { name: 'turf', test: /[\\/]node_modules[\\/]@turf[\\/]/ },
            { name: 'mantine', test: /[\\/]node_modules[\\/]@mantine[\\/](core|hooks|notifications)[\\/]/ },
            { name: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
