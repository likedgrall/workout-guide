import './server/load-env.mjs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PROXY_PORT || 8787}`,
        changeOrigin: true,
      },
    },
  },
})
