// Vitest yapılandırması: saf hesaplama fonksiyonları için Node ortamı, src ve scripts altındaki testler.

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    reporters: ['default'],
  },
})
