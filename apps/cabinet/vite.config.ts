import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const cabinetRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cabinetRoot, '');
  const mediaProxyTarget =
    env.VITE_MEDIA_API_URL?.replace(/\/$/, '') || 'http://localhost:3010';

  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@membrana/core': fileURLToPath(
        new URL('../../packages/core/src/index.ts', import.meta.url),
      ),
      '@membrana/media-library-service': fileURLToPath(
        new URL('../../packages/services/media-library/src/index.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3020',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
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
