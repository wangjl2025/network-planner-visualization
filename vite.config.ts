import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 部署需要设置 base 路径
  // 仓库名为 network-planner-visualization，所以 base 为 /network-planner-visualization/
  base: '/network-planner-visualization/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
