import { describe, expect, it, vi } from 'vitest';

import { preemptRunningScenario, type PreemptableRuntime } from './runtimePreemption';

describe('preemptRunningScenario — last-write-win (CT6, канон §3.2)', () => {
  it('runtime не запущен — можно стартовать сразу, stop не вызывается', async () => {
    const stop = vi.fn();
    const runtime: PreemptableRuntime = {
      getState: () => ({ isRunning: false }),
      stop,
    };

    await expect(preemptRunningScenario(runtime, undefined)).resolves.toBe(true);
    expect(stop).not.toHaveBeenCalled();
  });

  it('запущенный run останавливается (loser → stop) и ждёт settle', async () => {
    let isRunning = true;
    let settle: () => void = () => undefined;
    const runPromise = new Promise<void>((resolve) => {
      settle = resolve;
    });
    const stop = vi.fn(() => {
      // exec-abort завершает run асинхронно
      setTimeout(() => {
        isRunning = false;
        settle();
      }, 0);
    });
    const runtime: PreemptableRuntime = {
      getState: () => ({ isRunning }),
      stop,
    };

    const result = await preemptRunningScenario(runtime, runPromise);

    expect(stop).toHaveBeenCalledWith('system');
    expect(result).toBe(true);
  });

  it('rejected runPromise не ломает preemption', async () => {
    let isRunning = true;
    const runPromise = Promise.reject(new Error('AbortError'));
    const runtime: PreemptableRuntime = {
      getState: () => ({ isRunning }),
      stop: vi.fn(() => {
        isRunning = false;
      }),
    };

    await expect(preemptRunningScenario(runtime, runPromise)).resolves.toBe(true);
  });

  it('конкурентный preempt перезапустил runtime раньше — новый старт отменяется', async () => {
    const runtime: PreemptableRuntime = {
      // isRunning остаётся true и после settle: победил другой run
      getState: () => ({ isRunning: true }),
      stop: vi.fn(),
    };

    await expect(preemptRunningScenario(runtime, Promise.resolve())).resolves.toBe(false);
  });
});
