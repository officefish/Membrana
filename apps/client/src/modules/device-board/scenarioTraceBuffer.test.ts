import { describe, expect, it, vi } from 'vitest';

import {
  appendScenarioTraceLine,
  clearScenarioTraceBuffer,
  copyScenarioTraceToClipboard,
  formatScenarioTraceLine,
  getScenarioTraceLineCount,
  getScenarioTraceLines,
  getScenarioTraceText,
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
