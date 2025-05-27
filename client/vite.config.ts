import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    jsxImportSource: '@emotion/react',
    babel: {
      plugins: ['@emotion/babel-plugin']
    }
  })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    hmr: {
      clientPort: 443,
      protocol: 'wss',
      overlay: false
    },
    // Allow all Replit hosts
    allowedHosts: [
      '.replit.dev',
      '.replit.app',
      '.repl.co',
      'localhost',
      '.picard.replit.dev'
    ]
  },
  esbuild: {
    jsxInject: `import React from 'react'`
  }
})