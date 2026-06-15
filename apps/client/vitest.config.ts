import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

const resolvedViteConfig =
  typeof viteConfig === 'function'
    ? viteConfig({ mode: 'test', command: 'serve' })
    : viteConfig;

export default mergeConfig(
  resolvedViteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  }),
);
