
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'remove-vite-client-aggressive',
      enforce: 'post',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          // Remove todas as referências ao cliente Vite
          return html
            .replace(/<script[^>]*\/@vite\/client[^>]*><\/script>/g, '')
            .replace(/<script[^>]*type="module"[^>]*>[\s\S]*?@vite\/client[\s\S]*?<\/script>/gi, '')
            .replace(/import\s+.*?from\s+['"]@vite\/client['"];?/g, '')
            .replace(/import\s+['"]@vite\/client['"];?/g, '');
        },
      },
      transform(code, id) {
        // Remove importações do @vite/client de todos os arquivos
        if (code.includes('@vite/client')) {
          return {
            code: code
              .replace(/import\s+.*?from\s+['"]@vite\/client['"];?/g, '')
              .replace(/import\s+['"]@vite\/client['"];?/g, ''),
            map: null
          };
        }
      },
      generateBundle(options, bundle) {
        // Remover referências do Vite client dos arquivos JS gerados
        for (const fileName in bundle) {
          const file = bundle[fileName];
          if (file.type === 'chunk' && file.code) {
            file.code = file.code
              .replace(/@vite\/client/g, '')
              .replace(/import\s+.*?from\s+['"]@vite\/client['"];?/g, '');
          }
        }
      },
    },
  ],
  clearScreen: false,
  root: path.resolve(__dirname, "client"),
  publicDir: path.resolve(__dirname, "client/public"),
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(__dirname, "client/src")
      },
      {
        find: "@shared",
        replacement: path.resolve(__dirname, "shared")
      },
      {
        find: "@assets",
        replacement: path.resolve(__dirname, "attached_assets")
      }
    ]
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'wouter'],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: false,
    hmr: false,
    ws: false,
    watch: {
      usePolling: false,
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5000,
  },
  define: {
    __HMR_ENABLE__: false,
    'import.meta.hot': 'undefined',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'wouter'],
    force: false,
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
});
