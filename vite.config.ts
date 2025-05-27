
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'node:url';

// Constants
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isReplit = !!process.env.REPL_ID;
const isDev = process.env.NODE_ENV !== "production";

// Lazy load Replit plugins only when needed
const loadReplitPlugins = async () => {
  if (!isReplit || !isDev) return [];
  
  try {
    const plugins = [];
    
    // Runtime error overlay for development
    const { default: runtimeErrorOverlay } = await import("@replit/vite-plugin-runtime-error-modal");
    plugins.push(runtimeErrorOverlay());
    
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    plugins.push(cartographer());
    
    return plugins;
  } catch (error) {
    console.warn('Failed to load Replit plugins:', error.message);
    return [];
  }
};

export default defineConfig(async ({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Load Replit plugins if needed
  const replitPlugins = await loadReplitPlugins();
  
  return {
    plugins: [
      react({
        jsxRuntime: 'automatic',
        fastRefresh: true,
        include: '**/*.{tsx,ts,jsx,js}',
      }),
      ...replitPlugins,
    ],
    
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      // Optimized HMR for Replit
      hmr: isReplit ? {
        clientPort: 443,
        protocol: 'wss',
        timeout: 120000,
        overlay: false, // Prevent reload loops
      } : true,
      // Watch configuration for better file change detection
      watch: {
        usePolling: isReplit,
        interval: 1000,
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      },
      // Allow all hosts including Replit domains
      allowedHosts: 'all',
      // Proxy configuration for backend API
      proxy: {
        '/api': {
          target: 'http://0.0.0.0:5000',
          changeOrigin: true,
          secure: false,
          ws: true,
          timeout: 120000,
          proxyTimeout: 120000,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('Proxy error:', err);
            });
          }
        },
        '/socket.io': {
          target: 'http://0.0.0.0:5000',
          changeOrigin: true,
          ws: true,
          secure: false,
        }
      }
    },
    
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./client/src"),
        "@shared": path.resolve(__dirname, "./shared"),
        "@assets": path.resolve(__dirname, "./attached_assets"),
      },
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },
    
    root: path.resolve(__dirname, "./client"),
    publicDir: "public",
    base: './',
    
    build: {
      outDir: path.resolve(__dirname, "./dist/public"),
      emptyOutDir: true,
      target: 'es2020',
      minify: 'esbuild',
      sourcemap: false,
      cssCodeSplit: true,
      // Optimize chunk size and splitting
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-toast'],
            'router-vendor': ['wouter'],
            'query-vendor': ['@tanstack/react-query'],
            'utils': ['clsx', 'tailwind-merge', 'date-fns'],
          },
          // Optimize file naming
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        },
        // External dependencies that shouldn't be bundled
        external: [],
      },
      chunkSizeWarningLimit: 1000,
      // Increase memory limit for large builds
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
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
      exclude: [
        '@replit/vite-plugin-runtime-error-modal', 
        '@replit/vite-plugin-cartographer'
      ],
      force: isDev,
    },
    
    esbuild: {
      jsx: 'automatic',
      jsxDev: isDev,
      jsxImportSource: 'react',
      target: 'es2020',
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },
    
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      __DEV__: isDev,
      __PROD__: !isDev,
      __REPLIT__: isReplit,
    },
    
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
      devSourcemap: isDev,
      // PostCSS optimizations
      postcss: {},
    },
    
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
    },
    
    // Performance optimizations
    worker: {
      format: 'es',
    },
    
    // Experimental features for better performance
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === 'js') {
          return { js: `${filename}` };
        } else {
          return { relative: true };
        }
      },
    },
    
    // Error handling
    logLevel: isDev ? 'info' : 'warn',
    clearScreen: false,
  };
});
