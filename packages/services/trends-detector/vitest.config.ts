import { defineConfig } from 'vitest/config';

/** Изолированные fork-процессы — снижает риск OOM (exit 134) в turbo test на Windows/CI. */
export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
  },
});
