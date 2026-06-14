import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [dts({ include: ['src/**/*'], exclude: ['**/*.test.ts'], rollupTypes: true })],
  resolve: {
    alias: {
      '@membrana/core': fileURLToPath(new URL('../../../core/src/index.ts', import.meta.url)),
      '@membrana/detector-base': fileURLToPath(new URL('../base/src/index.ts', import.meta.url)),
      '@membrana/fft-analyzer-service': fileURLToPath(
        new URL('../../fft-analyzer/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    lib: { entry: resolve(__dirname, 'src/index.ts'), formats: ['es'], fileName: 'index' },
    rollupOptions: {
      external: ['@membrana/core', '@membrana/detector-base', '@membrana/fft-analyzer-service'],
    },
    sourcemap: true,
    target: 'es2022',
  },
});
