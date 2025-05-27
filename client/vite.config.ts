
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    hmr: {
      port: 5173,
      host: '0.0.0.0'
    },
    // Allow Replit hosts
    allowedHosts: [
      '.replit.dev',
      '.replit.app',
      '.repl.co',
      'localhost',
      '.picard.replit.dev'
    ]
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})
