import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';

/**
 * Vite library-mode config for @membrana/usercase-catalog-service.
 */
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/**/*'],
      exclude: ['**/*.test.ts'],
      rollupTypes: true,
    }),
  ],

  resolve: {
    alias: {
      '@membrana/core': fileURLToPath(new URL('../../core/src/index.ts', import.meta.url)),
      '@membrana/device-board': fileURLToPath(
        new URL('../../device-board/src/index.ts', import.meta.url),
      ),
    },
  },

  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@membrana/core',
        '@membrana/device-board',
      ],
    },
    sourcemap: true,
    target: 'es2022',
  },

  server: {
    port: 5188,
    open: false,
  },
});
