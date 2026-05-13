import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';

/**
 * Vite library-mode конфиг для сервиса @membrana/fft-analyzer-service.
 *
 * Цель — собрать сервис как ESM-библиотеку, пригодную для использования
 * за пределами монорепо. Внутри монорепо клиент резолвит сервис через
 * alias на ./src/index.ts, минуя сборку.
 *
 * Также в dev-режиме (vite без аргументов) сервис поднимается со своим
 * playground (./src/playground.tsx + ./index.html — добавь по необходимости),
 * чтобы Математик мог отлаживать ядро в изоляции.
 */
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/**/*'],
      exclude: ['**/*.test.ts', '**/playground.*'],
      rollupTypes: true,
    }),
  ],

  resolve: {
    alias: {
      '@membrana/core': fileURLToPath(
        new URL('../../core/src/index.ts', import.meta.url),
      ),
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
        '@membrana/core',
        '@membrana/audio-engine-service',
      ],
    },
    sourcemap: true,
    target: 'es2022',
  },

  server: {
    port: 5174,
    open: true,
  },
});
