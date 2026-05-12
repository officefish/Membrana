import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Vite-конфигурация клиента Membrana.
 *
 * Алиасы маппят имена пакетов монорепо на их ИСХОДНИКИ (src/index.ts),
 * а не на dist. Это даёт:
 *  - мгновенный HMR при правке кода в пакетах,
 *  - отсутствие шага "сначала собери @membrana/agenda, потом запусти клиент",
 *  - честные source maps до исходных .ts/.tsx файлов.
 *
 * Для прод-сборки Vite сам разрезолвит эти алиасы и соберёт всё в один бандл.
 */
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@membrana/core': fileURLToPath(
        new URL('../../packages/core/src/index.ts', import.meta.url),
      ),
      '@membrana/agenda': fileURLToPath(
        new URL('../../packages/agenda/src/index.ts', import.meta.url),
      ),
      '@membrana/device-board': fileURLToPath(
        new URL('../../packages/device-board/src/index.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    open: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
});
