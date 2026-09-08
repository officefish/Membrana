/**
 * ФИКСТУРА зубов читателя — источник, отдающий корень `/quota` сервера записей с полем
 * `bufferPolicy` (#2308, блок B). Это не стаб соседа: живой источник существует —
 * `ServerStorageBackend.getQuotaRaw()` через мост `lib/buffer-policy-bridge` (адаптер BC-1
 * интеграции `cowork-buffer-full-stop`). Здесь — управляемый источник для unit-зубов самого
 * читателя: отдать ответ, сломаться, отдать порчу. Боевой код его не импортирует.
 */
import type { BufferPolicySourceFn } from './bufferPolicyReader';

export interface QuotaSourceStub {
  readonly source: BufferPolicySourceFn;
  /** Следующие чтения отдают этот корень `/quota` (или объект политики — как решит зубу). */
  respondWith(raw: unknown): void;
  /** Следующие чтения бросают — дыра синка. */
  fail(error?: unknown): void;
  readonly calls: number;
}

/** Корень `/quota` так, как его отдаёт сервер записей (форма — из `QuotaResponseDto`). */
export function quotaRoot(bufferPolicy: unknown, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    userStorage: { usedBytes: 10, limitBytes: 1000, backend: 'server' },
    buffer: { usedBytes: 990, limitBytes: 1000, backend: 'server' },
    dataset: { catalogId: 'free-v1-catalog', sampleCount: 0 },
    userWorkspaces: { used: 0, limit: 3, backend: 'server' },
    ...(bufferPolicy === undefined ? {} : { bufferPolicy }),
    ...over,
  };
}

export function createQuotaSourceStub(initial: unknown = quotaRoot({ mode: 'stop', params: null })): QuotaSourceStub {
  let next: { kind: 'ok'; raw: unknown } | { kind: 'fail'; error: unknown } = { kind: 'ok', raw: initial };
  let calls = 0;
  return {
    source: async () => {
      calls += 1;
      if (next.kind === 'fail') throw next.error;
      return next.raw;
    },
    respondWith(raw) {
      next = { kind: 'ok', raw };
    },
    fail(error = new Error('media unreachable')) {
      next = { kind: 'fail', error };
    },
    get calls() {
      return calls;
    },
  };
}
