import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  // GitHub Pages 배포 시 저장소 이름으로 base 설정
  // 예: https://username.github.io/gleipi → base: '/gleipi/'
  base: process.env.GITHUB_PAGES ? '/gleipi/' : '/',
  build: { outDir: 'dist' },
})
