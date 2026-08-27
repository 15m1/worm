import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // 相对路径 base：GitHub Pages 挂在子路径（用户名.github.io/仓库名/）下也能正常加载资源
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Java 面试冲刺',
        short_name: '面试冲刺',
        description: 'Java 后端面试刷题记录与间隔复习工具，纯前端本地存储',
        lang: 'zh-CN',
        display: 'standalone',
        start_url: './',
        theme_color: '#0a0c16',
        background_color: '#0a0c16',
        icons: [
          { src: './pwa-192.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: './pwa-512.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: './pwa-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
})
