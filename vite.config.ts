import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',  // expose on local network for mobile testing
  },
  preview: {
    host: '0.0.0.0',  // also expose preview server on network
    port: 4173,
  },
  build: {
    target: 'es2015',  // broad compatibility for Bluefy's WebKit
  },
})
