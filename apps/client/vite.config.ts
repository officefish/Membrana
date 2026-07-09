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
  const isStudioBuild = env.MEMBRANA_STUDIO === '1' || env.MEMBRANA_STUDIO === 'true';
  const cabinetProxyTarget =
    env.VITE_CABINET_API_URL?.replace(/\/$/, '') || 'http://localhost:3020';
  const mediaProxyTarget =
    env.VITE_MEDIA_API_URL?.replace(/\/$/, '') || 'http://localhost:3010';

  return {
    base: isStudioBuild ? './' : '/',
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
        '@membrana/telemetry-journal-service': fileURLToPath(
          new URL('../../packages/services/telemetry-journal/src/index.ts', import.meta.url),
        ),
        '@membrana/media-library-service': fileURLToPath(
          new URL('../../packages/services/media-library/src/index.ts', import.meta.url),
        ),
        '@membrana/usercase-catalog-service': fileURLToPath(
          new URL('../../packages/services/usercase-catalog/src/index.ts', import.meta.url),
        ),
        '@membrana/audio-data-viz': fileURLToPath(
          new URL('../../packages/libs/audioDataViz/src/index.ts', import.meta.url),
        ),
        '@membrana/detector-report': fileURLToPath(
          new URL('../../packages/libs/detector-report/src/index.ts', import.meta.url),
        ),
        '@membrana/journal-report-views': fileURLToPath(
          new URL('../../packages/libs/journal-report-views/src/index.ts', import.meta.url),
        ),
        '@membrana/detector-base': fileURLToPath(
          new URL('../../packages/services/detectors/base/src/index.ts', import.meta.url),
        ),
        '@membrana/harmonic-detector-service': fileURLToPath(
          new URL('../../packages/services/detectors/harmonic/src/index.ts', import.meta.url),
        ),
        '@membrana/cepstral-detector-service': fileURLToPath(
          new URL('../../packages/services/detectors/cepstral/src/index.ts', import.meta.url),
        ),
        '@membrana/spectral-flux-detector-service': fileURLToPath(
          new URL('../../packages/services/detectors/spectral-flux/src/index.ts', import.meta.url),
        ),
        '@membrana/template-match-detector-service': fileURLToPath(
          new URL('../../packages/services/detectors/template-match/src/index.ts', import.meta.url),
        ),
        '@membrana/trends-detector-service': fileURLToPath(
          new URL('../../packages/services/trends-detector/src/index.ts', import.meta.url),
        ),
        '@membrana/drone-detection-orchestrator-service': fileURLToPath(
          new URL(
            '../../packages/services/drone-detection-orchestrator/src/index.ts',
            import.meta.url,
          ),
        ),
        '@membrana/detection-ensemble-service': fileURLToPath(
          new URL(
            '../../packages/services/detection-ensemble-service/src/index.ts',
            import.meta.url,
          ),
        ),
        // ВАЖНО: assets-подпуть ПЕРЕД пакетным алиасом — vite матчит алиасы
        // по префиксу в порядке объявления; иначе `assets/...?url` переписался
        // бы в `src/index.ts/assets/...`.
        '@membrana/yamnet-detector-service/assets': fileURLToPath(
          new URL('../../packages/services/detectors/yamnet/assets', import.meta.url),
        ),
        '@membrana/yamnet-detector-service': fileURLToPath(
          new URL('../../packages/services/detectors/yamnet/src/index.ts', import.meta.url),
        ),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      port: 5173,
      // Автооткрытие браузера гасится STUDIO_DEV=1 (студийный dev) и BROWSER=none
      // (общая конвенция; песочницы запрещают spawn внешних программ → EPERM
      // ронял dev-сервер при старте, хотя сам сервер поднимался нормально).
      open: env.STUDIO_DEV !== '1' && env.BROWSER !== 'none',
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
