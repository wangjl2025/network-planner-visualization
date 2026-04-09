import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages 部署需要设置 base 路径
  // 生产环境使用仓库名作为 base，开发环境使用根路径
  base: mode === 'production' ? '/network-planner-visualization/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
