import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ВАЖНО: exclude здесь намеренно отсутствует.
    // vitest v1.6.1 применяет test.exclude из config даже к явным путям на CLI,
    // поэтому `vitest run src/retriever/acceptance.test.ts` с exclude в config
    // находит 0 файлов. Исключение живёт только в `test` скрипте (--exclude флаг).
    //
    // cg1 (ci-gate-stabilization): retrieveContext (R1) гоняет реальный `git log`
    // + glob по docs/ репозитория. На нагруженном CI-раннере это интермиттентно
    // спайкало за 5s → флейк `retrieveContext ... > timed out in 5000ms`,
    // блокировавший verify на PR. Тесты корректны — им нужен запас на I/O.
    testTimeout: 30_000,
    reporters: process.env.CI ? ['verbose', 'json'] : ['default'],
    outputFile: { json: 'test-results/results.json' },
  },
});
