import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Preserve the browser-facing Host so the API can validate the request Origin.
// Vite's string shorthand enables changeOrigin and replaces Host with the API address.
const proxy = { '/api': { target: 'http://127.0.0.1:8080', changeOrigin: false } }

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { proxy },
})
