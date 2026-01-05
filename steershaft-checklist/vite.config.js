import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/steershaft-checklist/',

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Steershaft Checklist',
        short_name: 'Checklist',

        // 🔴 THIS IS THE KEY LINE
        start_url: '/steershaft-checklist/',

        scope: '/steershaft-checklist/',

        display: 'standalone',
        theme_color: '#111827',
        background_color: '#111827',
        icons: [
          {
            src: '/steershaft-checklist/pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/steershaft-checklist/pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
