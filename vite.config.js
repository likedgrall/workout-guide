import './server/load-env.mjs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://${process.env.API_PROXY_HOST || '127.0.0.1'}:${process.env.API_PROXY_PORT || 8787}`,
        changeOrigin: true,
      },
    },
  },
})
