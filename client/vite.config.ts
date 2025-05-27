
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
      protocol: 'wss'
    },
    // Allow Replit hosts
    allowedHosts: [
      '.replit.dev',
      '.replit.app',
      '.repl.co',
      'localhost'
    ]
  }
});
