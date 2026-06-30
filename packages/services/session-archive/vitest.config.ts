import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 5_000,
    reporters: process.env.CI ? ['verbose', 'json'] : ['default'],
    outputFile: { json: 'test-results/results.json' },
  },
});
