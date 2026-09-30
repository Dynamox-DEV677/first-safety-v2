import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// First Safety - static PWA. No backend, no analytics, no external requests.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'First Safety',
        short_name: 'First Safety',
        description: 'Animal-bite first aid and rabies prevention. The first 15 minutes matter most.',
        lang: 'en-IN',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        categories: ['health', 'education'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        // The speech worker is never precached: it is fetched only when someone taps "Prepare voice"
        // in Settings, and from then on the runtime cache below keeps it. The model and the ONNX
        // runtime (.wasm/.mjs emitted next to the worker, never in the precache glob) are cached by
        // transformers.js itself.
        globIgnores: ['**/voice.worker-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/voice\.worker-[^/]+\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'fs-voice', cacheableResponse: { statuses: [0, 200] }, expiration: { maxEntries: 8 } },
          },
        ],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  build: {
    target: 'es2019',
    sourcemap: false,
    chunkSizeWarningLimit: 2500,
  },
  // The speech worker bundles transformers.js; keep it out of the dev pre-bundler and emit it as
  // an ES module so its own dynamic imports work.
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
})
