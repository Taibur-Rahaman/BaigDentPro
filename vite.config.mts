import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { getResolvedViteApiUrlForProductionBuildOrThrow } = require('./scripts/resolveViteApiUrl.cjs')

/** Bust intermediaries that key only by URL path without honoring rolling hashed filenames. */
function appendAssetCacheBust(html: string, buildId: string): string {
  const q = encodeURIComponent(buildId)
  return html.replace(
    /(\/(?:assets\/[^"'>\s]+\.(?:js|css)))(["'\s>])/g,
    `$1?v=${q}$2`
  )
}

export default defineConfig(({ command }) => {
  /** One build = one query on index.html asset URLs (CDN / path-only caches). */
  const buildId = process.env.BUILD_ID?.trim() || String(Date.now())

  return {
  plugins: [
    react(),
    {
      name: 'enforce-vite-api-url-production-mode',
      configResolved(config) {
        if (config.command !== 'build' || config.mode !== 'production') return
        getResolvedViteApiUrlForProductionBuildOrThrow(__dirname)
      },
    },
    {
      name: 'index-html-asset-cache-bust',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          if (command !== 'build') return html
          return appendAssetCacheBust(html, buildId)
        },
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
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@tanstack')) return 'vendor-virtual';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('react-dom')) return 'vendor-react-dom';
          if (id.includes('/react/') || id.endsWith('react/index.js')) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
}})
