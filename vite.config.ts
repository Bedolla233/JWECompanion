import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['images/**/*'],
      manifest: {
        name: 'JWE3-Companion',
        short_name: 'JWE3 Planner',
        description: 'Enclosure and expedition planner for Jurassic World Evolution 3',
        theme_color: '#0b0f19',
        background_color: '#0b0f19',
        filename: 'manifest.json',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/images/families/dino_icon.webp',
            sizes: '192x192',
            type: 'image/webp'
          },
          {
            src: '/images/families/dino_icon.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
        maximumFileSizeToCacheInBytes: 5000000
      },
      devOptions: {
        enabled: false 
      }
    })
  ]
});