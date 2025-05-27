
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath, URL } from 'node:url';

// ES module __dirname equivalent
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Replit-specific imports
const runtimeErrorOverlay = process.env.REPL_ID 
  ? await import("@replit/vite-plugin-runtime-error-modal").then(m => m.default)
  : null;

const cartographer = process.env.REPL_ID && process.env.NODE_ENV !== "production"
  ? await import("@replit/vite-plugin-cartographer").then(m => m.cartographer)
  : null;

export default defineConfig({
  plugins: [
    react({
      // Force automatic JSX runtime for Replit
      jsxRuntime: 'automatic',
      // Include all possible file extensions
      include: '**/*.{jsx,tsx,js,ts,mjs,cjs}',
    }),
    ...(runtimeErrorOverlay ? [runtimeErrorOverlay()] : []),
    ...(cartographer ? [cartographer()] : []),
  ],
  server: {
    // Replit requires these exact settings
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
    },
  },
  root: path.resolve(__dirname, "./client"),
  build: {
    outDir: path.resolve(__dirname, "./dist/public"),
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
});
