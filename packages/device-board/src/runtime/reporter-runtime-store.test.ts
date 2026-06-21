import { describe, expect, it } from 'vitest';
import { formatJournalRefHandle } from '@membrana/core';

import { ReporterRuntimeStore } from './reporter-runtime-store.js';

describe('ReporterRuntimeStore (DBJ2)', () => {
  it('returns stable ReporterRef per journal handle', () => {
    const store = new ReporterRuntimeStore();
    const journalHandle = formatJournalRefHandle('device', 'dev-1');
    const first = store.getReporterRef(journalHandle);
    const second = store.getReporterRef(journalHandle);
    expect(first).toEqual(second);
    expect(first.kind).toBe('ReporterRef');
    expect(first.handle).toBe(`reporter:${journalHandle}`);
    expect(first.valid).toBe(true);
  });

  it('resetAll clears registry', () => {
    const store = new ReporterRuntimeStore();
    const journalHandle = formatJournalRefHandle('server', 'dev-2');
    store.getReporterRef(journalHandle);
    store.resetAll();
    const afterReset = store.getReporterRef(journalHandle);
    expect(afterReset.handle).toBe(`reporter:${journalHandle}`);
  });
});
