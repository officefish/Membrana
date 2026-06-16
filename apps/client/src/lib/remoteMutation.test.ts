import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  RemoteMutationTimeoutError,
  runRemoteMutation,
} from './remoteMutation';

describe('runRemoteMutation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when operation completes before timeout', async () => {
    const result = await runRemoteMutation('test', async () => 42);
    expect(result).toBe(42);
  });

  it('rejects with RemoteMutationTimeoutError when operation hangs', async () => {
    await expect(
      runRemoteMutation(
        'Очистка буфера',
        () => new Promise<void>(() => undefined),
        { timeoutMs: 20 },
      ),
    ).rejects.toBeInstanceOf(RemoteMutationTimeoutError);
  }, 10_000);

  it('aborts when parent signal aborts', async () => {
    const parent = new AbortController();
    const pending = runRemoteMutation(
      'test',
      async (signal) => {
        await new Promise<void>((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        });
      },
      { signal: parent.signal, timeoutMs: 5_000 },
    );
    parent.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
