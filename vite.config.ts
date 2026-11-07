import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// La app se publica en https://<usuario>.github.io/ejercicios-en-casa/
export default defineConfig({
  base: './',
  // fecha y hora de esta versión (se muestra en Ajustes)
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  plugins: [
    VitePWA({
      // la versión nueva se aplica cuando el usuario pulsa "Actualizar" (nunca en mitad de un entrenamiento)
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Ejercicios en casa',
        short_name: 'Ejercicios',
        description: 'Rutinas de calentamiento, pesas, abdominales y estiramientos en casa.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0A0D12',
        theme_color: '#0A0D12',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // las novedades se leen siempre del servidor
        globIgnores: ['**/novedades.json'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Las fuentes de Google se guardan la primera vez para poder usarlas sin conexión.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fuentes', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 800 },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
});
