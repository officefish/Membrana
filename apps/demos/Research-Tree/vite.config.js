import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@membrana/device-board': fileURLToPath(new URL('../../../packages/device-board/src/index.ts', import.meta.url)),
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 5174,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        target: 'es2022',
    },
});
