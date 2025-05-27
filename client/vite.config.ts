
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      fastRefresh: true,
      include: '**/*.{tsx,ts,jsx,js}',
    }),
  ],
  
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
    allowedHosts: [
      '.replit.dev',
      '.replit.app',
      '.repl.co',
      'localhost',
      '.picard.replit.dev'
    ]
  },
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
      "@assets": path.resolve(__dirname, "../attached_assets"),
    },
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  
  build: {
    outDir: path.resolve(__dirname, "../dist/public"),
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: true,
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-query',
      'wouter',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
  },
  
  esbuild: {
    jsx: 'automatic',
    jsxDev: true,
    jsxImportSource: 'react',
    target: 'es2020',
  },
});
