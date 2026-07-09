import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';

/**
 * Vite library-mode конфиг для @membrana/detection-ensemble-service.
 *
 * Сервис headless (без React/DOM): ядро — чистая оркестрация детекторов
 * над fusion-ядром core. Внутри монорепо клиент резолвит через alias на
 * ./src/index.ts. `@membrana/audio-engine-service` в alias/external —
 * транзитивный type-only импорт из @membrana/detector-base (AudioSampleFrame).
 */
export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      exclude: ['**/*.test.ts'],
      rollupTypes: true,
    }),
  ],
  resolve: {
    alias: {
      '@membrana/core': fileURLToPath(
        new URL('../../core/src/index.ts', import.meta.url),
      ),
      '@membrana/detector-base': fileURLToPath(
        new URL('../detectors/base/src/index.ts', import.meta.url),
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
        '@membrana/core',
        '@membrana/detector-base',
        '@membrana/audio-engine-service',
      ],
    },
    sourcemap: true,
    target: 'es2022',
  },
});
