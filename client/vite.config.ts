import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'react',
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    })
  ],
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
      port: 5173,
      host: '0.0.0.0'
    },
    // Allow all Replit hosts
    allowedHosts: [
      '.replit.dev',
      '.replit.app',
      '.repl.co',
      'localhost',
      '.picard.replit.dev'
    ]
  }
})