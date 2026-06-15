import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const clientRoot = fileURLToPath(new URL('.', import.meta.url));

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
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, clientRoot, '');
  const cabinetProxyTarget =
    env.VITE_CABINET_API_URL?.replace(/\/$/, '') || 'http://localhost:3020';
  const mediaProxyTarget =
    env.VITE_MEDIA_API_URL?.replace(/\/$/, '') || 'http://localhost:3010';

  return {
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
        '@membrana/audio-engine-service': fileURLToPath(
          new URL('../../packages/services/audio-engine/src/index.ts', import.meta.url),
        ),
        '@membrana/fft-analyzer-service': fileURLToPath(
          new URL('../../packages/services/fft-analyzer/src/index.ts', import.meta.url),
        ),
        '@membrana/sample-playback-service': fileURLToPath(
          new URL('../../packages/services/sample-playback/src/index.ts', import.meta.url),
        ),
        '@membrana/telemetry-service': fileURLToPath(
          new URL('../../packages/services/telemetry/src/index.ts', import.meta.url),
        ),
        '@membrana/media-library-service': fileURLToPath(
          new URL('../../packages/services/media-library/src/index.ts', import.meta.url),
        ),
        '@membrana/audio-data-viz': fileURLToPath(
          new URL('../../packages/libs/audioDataViz/src/index.ts', import.meta.url),
        ),
        '@membrana/detector-base': fileURLToPath(
          new URL('../../packages/services/detectors/base/src/index.ts', import.meta.url),
        ),
        '@membrana/harmonic-detector-service': fileURLToPath(
          new URL('../../packages/services/detectors/harmonic/src/index.ts', import.meta.url),
        ),
        '@membrana/trends-detector-service': fileURLToPath(
          new URL('../../packages/services/trends-detector/src/index.ts', import.meta.url),
        ),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api-cabinet': {
          target: cabinetProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-cabinet/, ''),
        },
        '/api-media': {
          target: mediaProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-media/, ''),
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'es2022',
    },
  };
});
