import { defineConfig } from 'vite';

// base './' is required so the bundle loads from file:// / the Capacitor WebView.
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } },
    },
  },
  // Phaser ships ~1,500 inline license comments (~270 KB): move them to the end of the chunk.
  esbuild: { legalComments: 'eof' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as any);
