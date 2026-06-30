import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ВАЖНО: exclude здесь намеренно отсутствует.
    // vitest v1.6.1 применяет test.exclude из config даже к явным путям на CLI,
    // поэтому `vitest run src/retriever/acceptance.test.ts` с exclude в config
    // находит 0 файлов. Исключение живёт только в `test` скрипте (--exclude флаг).
    // Operative repo scans can exceed 5s under full Turbo concurrency on Windows.
    // Keep the unit suite deterministic, but give CI/merge-CI enough headroom.
    testTimeout: 30_000,
    reporters: process.env.CI ? ['verbose', 'json'] : ['default'],
    outputFile: { json: 'test-results/results.json' },
  },
});
