import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    reporters: process.env.CI ? ['verbose', 'json'] : ['default'],
    outputFile: { json: 'test-results/results.json' },
  },
});
