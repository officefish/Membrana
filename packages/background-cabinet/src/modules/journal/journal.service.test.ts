import { describe, expect, it } from 'vitest';

import { paginateLiveJournalItemRows } from './live-journal-pagination';
import { parseJournalListLimit } from './journal.service';

describe('parseJournalListLimit', () => {
  it('defaults invalid limit to 50', () => {
    expect(parseJournalListLimit(undefined)).toBe(50);
    expect(parseJournalListLimit('abc')).toBe(50);
    expect(parseJournalListLimit('0')).toBe(50);
  });

  it('caps limit at 50 (TJ9 page size)', () => {
    expect(parseJournalListLimit('500')).toBe(50);
    expect(parseJournalListLimit('25')).toBe(25);
  });
});

describe('paginateLiveJournalItemRows', () => {
  it('returns nextCursor when more rows exist', () => {
    const rows = Array.from({ length: 60 }, (_, index) => ({
      id: `id-${index}`,
      kind: 'track' as const,
      timestamp: 1_000 - index,
      clientEntryId: `ce-${index}`,
      moduleId: 'microphone',
      moduleName: 'microphone',
      tags: ['live', 'track'],
      track: {},
    }));

    const page = paginateLiveJournalItemRows(rows, { limit: 50 });
    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).not.toBeNull();
  });
});
