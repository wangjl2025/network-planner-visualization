import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // 生产环境下复制 index.html 为 404.html，用于 GitHub Pages SPA 回退
    mode === 'production' && {
      name: 'copy-404',
      closeBundle() {
        const outDir = path.resolve(__dirname, 'dist')
        const indexFile = path.join(outDir, 'index.html')
        const notFoundFile = path.join(outDir, '404.html')
        if (fs.existsSync(indexFile)) {
          fs.copyFileSync(indexFile, notFoundFile)
          console.log('Copied index.html to 404.html for GitHub Pages SPA fallback')
        }
      },
    },
  ].filter(Boolean),
  // GitHub Pages 部署需要设置 base 路径
  // 生产环境使用仓库名作为 base，开发环境使用根路径
  base: mode === 'production' ? '/network-planner-visualization/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
