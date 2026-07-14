import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Панель НЕ импортирует internals кабинета и пакетов (консилиум office-panel-contour,
// OP1): никаких @membrana/* алиасов — данные приходят только через HTTP /v1/* office.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5175,
    proxy: {
      // Дев-зеркало прод-топологии: Caddy на panel.mmbrn.tech проксирует /v1/* → office.
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
});
