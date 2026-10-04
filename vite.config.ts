import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// First Safety - static PWA. No backend for anyone's data, no analytics, no third-party requests:
// even the voice model is served from public/models. The one outside call is the optional online
// helper (/api/match, off by default), and that goes through this site's own function.
export default defineConfig({
  // Routes are hash-based, so no server fallback to index.html is needed. Without one, a missing file
  // is a 404 locally, exactly as on Vercel: the speech library treats a 404 as "optional file absent",
  // but an HTML page served in its place would break it.
  appType: 'mpa',
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
        // The speech worker is not precached, so installing the app never waits on it: it is fetched by
        // the background voice install, and from then on the runtime cache below keeps it. The model and the ONNX
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
        // The optional online matcher is a serverless function, never a page.
        navigateFallbackDenylist: [/^\/api\//],
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
