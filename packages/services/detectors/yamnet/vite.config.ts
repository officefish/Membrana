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
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        node: resolve(__dirname, 'src/node.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      // tfjs и node:* не бандлим: tfjs тяжёлый и общий, node-модули ломают браузерный бандл.
      external: [
        '@membrana/core',
        '@membrana/detector-base',
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-backend-wasm',
        /^node:/,
      ],
    },
    sourcemap: true,
    target: 'es2022',
  },
});
