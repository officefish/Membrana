import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/detector.integration.test.ts'],
    testTimeout: 10_000,
    reporters: process.env.CI ? ['verbose', 'json'] : ['default'],
    outputFile: { json: 'test-results/results.json' },
  },
});
