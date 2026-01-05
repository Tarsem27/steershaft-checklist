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
        display: 'standalone',
        start_url: '/',
        theme_color: '#111827',
        background_color: '#111827',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
