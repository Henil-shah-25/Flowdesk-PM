import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /script\.google\.com/],
        runtimeCaching: [
          {
            // CRITICAL: Ensure all Google Apps Script API calls are NetworkOnly and never cached by Service Worker
            urlPattern: /^https:\/\/script\.google\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'Flowdesk',
        short_name: 'Flowdesk',
        description: 'Single-user personal project management web app',
        theme_color: '#F4F5F7',
        background_color: '#F4F5F7',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
