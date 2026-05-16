import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const demoDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: demoDir,
  plugins: [react()],
  css: {
    postcss: fileURLToPath(new URL('./postcss.config.js', import.meta.url)),
  },
  resolve: {
    alias: {
      '@membrana/core': fileURLToPath(
        new URL('../../../../core/src/index.ts', import.meta.url),
      ),
      '@membrana/detector-base': fileURLToPath(
        new URL('../../base/src/index.ts', import.meta.url),
      ),
      '@membrana/audio-engine-service': fileURLToPath(
        new URL('../../../audio-engine/src/index.ts', import.meta.url),
      ),
      '@membrana/fft-analyzer-service': fileURLToPath(
        new URL('../../../fft-analyzer/src/index.ts', import.meta.url),
      ),
      '@membrana/harmonic-detector-service': fileURLToPath(
        new URL('../src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5178,
    open: true,
  },
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
  },
});
