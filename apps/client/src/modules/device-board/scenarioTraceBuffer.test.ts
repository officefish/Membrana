import { describe, expect, it, vi } from 'vitest';

import {
  appendScenarioTraceLine,
  clearScenarioTraceBuffer,
  copyScenarioTraceToClipboard,
  flushScenarioTraceNotifyForTests,
  formatScenarioTraceLine,
  getScenarioTraceLineCount,
  getScenarioTraceLines,
  getScenarioTraceText,
  subscribeScenarioTraceBuffer,
} from './scenarioTraceBuffer';

describe('scenarioTraceBuffer', () => {
  it('formats lines with context like console filter', () => {
    expect(formatScenarioTraceLine('[device-board] main-tick-start', { runId: 'abc', tick: 1 })).toBe(
      "[INFO] [device-board] main-tick-start {runId: 'abc', tick: 1}",
    );
  });

  it('ring buffer append and clear', () => {
    clearScenarioTraceBuffer();
    appendScenarioTraceLine('[device-board][media] upload-ok', { sampleId: 's1' });
    expect(getScenarioTraceLineCount()).toBe(1);
    expect(getScenarioTraceText()).toContain('upload-ok');
    clearScenarioTraceBuffer();
    expect(getScenarioTraceLineCount()).toBe(0);
  });

  it('getScenarioTraceLines: стабильный снапшот между мутациями (useSyncExternalStore)', () => {
    clearScenarioTraceBuffer();
    appendScenarioTraceLine('first');
    const snapshot = getScenarioTraceLines();
    expect(snapshot).toEqual(['[INFO] first']);
    expect(getScenarioTraceLines()).toBe(snapshot);
    appendScenarioTraceLine('second');
    const next = getScenarioTraceLines();
    expect(next).not.toBe(snapshot);
    expect(next).toEqual(['[INFO] first', '[INFO] second']);
    clearScenarioTraceBuffer();
    expect(getScenarioTraceLines()).toEqual([]);
  });

  it('copyScenarioTraceToClipboard uses navigator.clipboard', async () => {
    clearScenarioTraceBuffer();
    appendScenarioTraceLine('line');
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(copyScenarioTraceToClipboard()).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('[INFO] line');
    vi.unstubAllGlobals();
  });
});

describe('#2328 g2: пробуждение подписчиков схлопнуто до кадра', () => {
  it('ПОРЧА-ПРЕДИКАТ: N строк будят подписчика ОДИН раз, а не N', () => {
    clearScenarioTraceBuffer();
    flushScenarioTraceNotifyForTests();
    let wakes = 0;
    const off = subscribeScenarioTraceBuffer(() => {
      wakes += 1;
    });
    const N = 500;
    for (let i = 0; i < N; i += 1) {
      appendScenarioTraceLine(`line ${i}`);
    }
    // До сброса не разбудили ни разу: сигнал отложен, данные — нет.
    expect(wakes).toBe(0);
    flushScenarioTraceNotifyForTests();
    // Прежняя редакция будила ровно N раз — на ней этот зуб краснеет.
    expect(wakes).toBe(1);
    expect(wakes).toBeLessThan(N);
    off();
  });

  it('данные СИНХРОННЫ, несмотря на отложенный сигнал', () => {
    clearScenarioTraceBuffer();
    flushScenarioTraceNotifyForTests();
    appendScenarioTraceLine('немедленно');
    // Снимок обязан отдавать новое содержимое ДО пробуждения подписчиков:
    // useSyncExternalStore читает getSnapshot при любом рендере, а не только по сигналу.
    expect(getScenarioTraceLines()).toEqual(['[INFO] немедленно']);
    expect(getScenarioTraceLineCount()).toBe(1);
    flushScenarioTraceNotifyForTests();
  });

  it('последнее изменение НЕ теряется: сигнал приходит и после одиночной строки', () => {
    clearScenarioTraceBuffer();
    flushScenarioTraceNotifyForTests();
    let wakes = 0;
    const off = subscribeScenarioTraceBuffer(() => {
      wakes += 1;
    });
    appendScenarioTraceLine('одна');
    flushScenarioTraceNotifyForTests();
    expect(wakes).toBe(1);
    // Молчание после последней строки оставило бы панель со старым содержимым навсегда.
    off();
  });

  it('очистка тоже будит подписчика', () => {
    clearScenarioTraceBuffer();
    appendScenarioTraceLine('перед очисткой');
    flushScenarioTraceNotifyForTests();
    let wakes = 0;
    const off = subscribeScenarioTraceBuffer(() => {
      wakes += 1;
    });
    clearScenarioTraceBuffer();
    flushScenarioTraceNotifyForTests();
    expect(wakes).toBe(1);
    expect(getScenarioTraceLineCount()).toBe(0);
    off();
  });
});
