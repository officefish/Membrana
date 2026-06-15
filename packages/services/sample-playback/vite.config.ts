import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';

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
      '@membrana/audio-engine-service': fileURLToPath(
        new URL('../audio-engine/src/index.ts', import.meta.url),
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
        '@membrana/audio-engine-service',
      ],
    },
    sourcemap: true,
    target: 'es2022',
  },

  server: {
    port: 5176,
    open: false,
  },
});
