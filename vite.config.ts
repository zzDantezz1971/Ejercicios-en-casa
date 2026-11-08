import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// La app se publica en https://<usuario>.github.io/ejercicios-en-casa/
// Con --mode android se genera la versión para la app Android (Capacitor): sin service worker
// (las versiones nuevas llegan por Google Play) y en la carpeta dist-android.
export default defineConfig(({ mode }) => ({
  base: './',
  resolve: mode === 'android' ? { alias: { 'virtual:pwa-register': fileURLToPath(new URL('./src/platform/pwa-stub.ts', import.meta.url)) } } : undefined,
  // fecha y hora de esta versión (se muestra en Ajustes)
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  plugins: mode === 'android' ? [] : [
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
        // identidad propia de la app instalada (nueva, para que Chrome no se líe con una instalación anterior)
        id: './?app=ejercicios-v2',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0A0D12',
        theme_color: '#0A0D12',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
  build: { chunkSizeWarningLimit: 800, outDir: mode === 'android' ? 'dist-android' : 'dist' },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
}));
