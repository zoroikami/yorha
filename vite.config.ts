import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/php': {
        target: 'http://localhost/Vynas',
        changeOrigin: true,
      },
      '/data': {
        target: 'http://localhost/Vynas',
        changeOrigin: true,
      },
      '/img': {
        target: 'http://localhost/Vynas',
        changeOrigin: true,
      }
    }
  }
})
