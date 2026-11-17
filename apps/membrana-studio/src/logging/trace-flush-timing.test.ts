import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  TRACE_FLUSH_FRAME_BUDGET_MS,
  TRACE_FLUSH_TIMING_ENV,
  formatTraceFlushTiming,
  isTraceFlushTimingEnabled,
  traceFlushTimingLevel,
} from './trace-flush-timing';

describe('isTraceFlushTimingEnabled', () => {
  it('выключен, когда переменной нет — продуктовое умолчание', () => {
    expect(isTraceFlushTimingEnabled({})).toBe(false);
  });

  it('включается строго значением 1', () => {
    expect(isTraceFlushTimingEnabled({ [TRACE_FLUSH_TIMING_ENV]: '1' })).toBe(true);
  });

  it('любое другое значение не включает замер', () => {
    for (const value of ['0', 'true', 'yes', '', ' 1', '11']) {
      expect(isTraceFlushTimingEnabled({ [TRACE_FLUSH_TIMING_ENV]: value })).toBe(false);
    }
  });
});

describe('traceFlushTimingLevel', () => {
  it('в пределах кадра — справка', () => {
    expect(traceFlushTimingLevel(0)).toBe('info');
    expect(traceFlushTimingLevel(TRACE_FLUSH_FRAME_BUDGET_MS - 0.1)).toBe('info');
  });

  it('кадр и дольше — предупреждение', () => {
    expect(traceFlushTimingLevel(TRACE_FLUSH_FRAME_BUDGET_MS)).toBe('warn');
    expect(traceFlushTimingLevel(210)).toBe('warn');
  });
});

describe('formatTraceFlushTiming', () => {
  it('несёт простой, кадры, объём и runId', () => {
    const message = formatTraceFlushTiming({ blockedMs: 21.87, chars: 1_230_913, runId: 'run-a' });

    expect(message).toContain('21.9 ms');
    expect(message).toContain('1.4 frames');
    expect(message).toContain('chars=1230913');
    expect(message).toContain('runId=run-a');
  });

  it('пустой runId пишется как none, а не как пустая дырка', () => {
    expect(formatTraceFlushTiming({ blockedMs: 1, chars: 10, runId: null })).toContain('runId=none');
    expect(formatTraceFlushTiming({ blockedMs: 1, chars: 10, runId: '' })).toContain('runId=none');
  });
});

describe('sandboxed preload source tooth', () => {
  const preloadSource = readFileSync(resolve(__dirname, '..', 'preload.ts'), 'utf8');
  const registerIpcSource = readFileSync(resolve(__dirname, 'register-ipc.ts'), 'utf8');

  it('не вносит относительный runtime-import в sandboxed preload', () => {
    const runtimeImports = preloadSource
      .split(/\r?\n/u)
      .filter((line) => /^import(?! type\b).*from ['"]\.\//u.test(line));
    expect(runtimeImports).toEqual([]);
  });

  it('несёт те же порог, флаг и формат, что канонический helper', () => {
    expect(preloadSource).toContain('const TRACE_FLUSH_FRAME_BUDGET_MS = 16;');
    expect(preloadSource).toContain("env.MEMBRANA_TRACE_FLUSH_TIMING === '1'");
    expect(preloadSource).toContain('blockedMs >= TRACE_FLUSH_FRAME_BUDGET_MS');
    expect(preloadSource).toContain('scenario trace flush blocked renderer');
    expect(preloadSource).toContain('frames @60Hz, chars=');
  });

  it('sync-обработчик всегда отвечает renderer после записи', () => {
    expect(registerIpcSource.match(/event\.returnValue = null;/gu)).toHaveLength(2);
    expect(registerIpcSource.indexOf('writeScenarioTraceLatest')).toBeLessThan(
      registerIpcSource.lastIndexOf('event.returnValue = null;'),
    );
  });
});
