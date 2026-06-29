import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/acceptance.test.ts'],
    testTimeout: 30_000,
    reporters: process.env.CI ? ['verbose', 'json'] : ['default'],
    outputFile: { json: 'test-results/results.json' },
  },
});
