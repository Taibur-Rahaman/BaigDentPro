import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { getResolvedViteApiUrlForProductionBuildOrThrow } = require('./scripts/resolveViteApiUrl.cjs')

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'enforce-vite-api-url-production-mode',
      configResolved(config) {
        if (config.command !== 'build' || config.mode !== 'production') return
        getResolvedViteApiUrlForProductionBuildOrThrow(__dirname)
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
