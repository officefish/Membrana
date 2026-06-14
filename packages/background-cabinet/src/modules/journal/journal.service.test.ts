import { describe, expect, it } from 'vitest';

import { parseJournalListLimit } from './journal.service';

describe('parseJournalListLimit', () => {
  it('defaults invalid limit to 50', () => {
    expect(parseJournalListLimit(undefined)).toBe(50);
    expect(parseJournalListLimit('abc')).toBe(50);
    expect(parseJournalListLimit('0')).toBe(50);
  });

  it('caps limit at 200', () => {
    expect(parseJournalListLimit('500')).toBe(200);
    expect(parseJournalListLimit('25')).toBe(25);
  });
});
